import {ActionConfirmationStatus} from "@stackr/sdk";
import express, {Request, Response} from "express";
import {stackedMachine} from "./stackr/machine";
import {mru} from "./stackr/mru";
import {AddBalanceSchema, schemas} from "./stackr/schemas";
import {transitions} from "./stackr/transitions";
import {Bridge} from "@stackr/sdk/plugins";

import {AbiCoder, formatEther, Wallet} from "ethers";
import {signMessage} from "./utils.ts";


const PORT = 3210;

const abiCoder = AbiCoder.defaultAbiCoder();
const operator = new Wallet(process.env.PRIVATE_KEY as string);

export async function setupServer() {

    Bridge.init(mru, {
        handlers: {
            BRIDGE_ETH: async (args) => {
                const [to, amount] = abiCoder.decode(["address", "uint"], args.data);
                console.log("Adding ETH to", to, ". Amount = ", amount);
                const inputs = {
                    address: to,
                    amount: Number(amount),
                };
                AddBalanceSchema.setEip712domain({
                    name: "bridge",
                    version: "1"
                })
                const signature = await signMessage(operator, AddBalanceSchema, inputs);
                const action = AddBalanceSchema.actionFrom({
                    inputs,
                    signature,
                    msgSender: operator.address,
                });

                return {
                    transitionName: "addBalance",
                    action,
                };
            },
        },
    });
    console.log("Waiting for BRIDGE_ETH event on the bridge contract...");

    const app = express();
    app.use(express.json());
    // allow CORS
    app.use((_req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, X-Requested-With, Content-Type, Accept"
        );
        next();
    });

    const {stateMachines, config, getStfSchemaMap, submitAction} = mru;
    const machine = stateMachines.getFirst<typeof stackedMachine>();

    if (!machine) {
        throw new Error("Machine not found");
    }

    const transitionToSchema = getStfSchemaMap();

    /** Routes */
    app.get("/info", (_req: Request, res: Response) => {
        res.send({
            isSandbox: config.isSandbox,
            domain: config.domain,
            transitionToSchema,
            schemas: Object.values(schemas).reduce((acc, schema) => {
                acc[schema.identifier] = {
                    primaryType: schema.EIP712TypedData.primaryType,
                    types: schema.EIP712TypedData.types,
                };
                return acc;
            }, {} as Record<string, any>),
        });
    });

    app.post("/:transition", async (req: Request, res: Response) => {
        const {transition} = req.params;

        if (!transitions[transition]) {
            res.status(400).send({message: "NO_TRANSITION_FOR_ACTION"});
            return;
        }

        try {
            const {msgSender, signature, inputs} = req.body;

            const schemaId = transitionToSchema[transition];
            const schema = Object.values(schemas).find(
                (schema) => schema.identifier === schemaId
            );

            if (!schema) {
                throw new Error("NO_SCHEMA_FOUND");
            }

            const signedAction = schema.actionFrom({
                msgSender,
                signature,
                inputs,
            });

            const ack = await submitAction(transition, signedAction);
            const {logs, errors} = await ack.waitFor(ActionConfirmationStatus.C1);
            if (errors?.length) {
                throw new Error(errors[0].message);
            }
            res.status(201).send({logs, ackHash: ack.hash});
        } catch (e: any) {
            res.status(400).send({error: e.message});
        }
        return;
    });

    app.get("/", (_req: Request, res: Response) => {
        res.json({state: machine.state});
    });

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
