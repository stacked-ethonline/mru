import {ActionConfirmationStatus, ConfirmationEvents} from "@stackr/sdk";
import express, {Request, Response} from "express";
import {stackedMachine} from "./stackr/machine";
import {mru} from "./stackr/mru";
import {AddBalanceSchema, CreateNFTSchema, schemas} from "./stackr/schemas";
import {transitions} from "./stackr/transitions";
import {Bridge} from "@stackr/sdk/plugins";
import {Client, Conversation} from "@xmtp/xmtp-js";

import {AbiCoder, Wallet} from "ethers";
import {signMessage} from "./utils.ts";
import {CreateNFTInput} from "./stackr/types.ts";


const PORT = 3210;

const abiCoder = AbiCoder.defaultAbiCoder();
const operator = new Wallet(process.env.PRIVATE_KEY as string);

class XMTPNotifier {
    xmtpClient: Client;
    // mapping to store XMTP conversations, keyed by msg sender address.
    conversations: Map<string, Conversation> = new Map();

    constructor(xmtpClient: Client) {
        this.xmtpClient = xmtpClient;
    }

    async getOrCreateConversation(address: string): Promise<Conversation> {
        if (!this.conversations.has(address)) {
            const conversation = await this.xmtpClient.conversations.newConversation(
                address
            );
            this.conversations.set(address, conversation);
        }
        return this.conversations.get(address)!;
    }

    async notifyUser(address: string, message: string) {
        try {
            const conversation = await this.getOrCreateConversation(address);
            await conversation.send(message);
            console.log(`Sent message to ${address}:`, message);
        } catch (error) {
            console.error(`Failed to send message to ${address}:`, error);
        }
    }
}

export async function setupServer() {

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

    const xmtpClient = await Client.create(operator);
    let xmtpNotifier: XMTPNotifier = new XMTPNotifier(xmtpClient);
    console.log("XMTP client initialized");

    const {events} = mru;

    // events.subscribe(ConfirmationEvents.C1, async (args) => {
    //     if (args.msgSender) {
    //         await xmtpNotifier.notifyUser(
    //             args.msgSender as string,
    //             `Action submitted: ${JSON.stringify(args)}`
    //         );
    //     }
    // });

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });


    Bridge.init(mru, {
        handlers: {
            BRIDGE_ETH: async (args) => {
                const [to, amount, timestamp] = abiCoder.decode(["address", "uint", "uint"], args.data);
                console.log("Adding ETH to", to, ". Amount = ", amount);
                const inputs = {
                    address: to,
                    amount: (amount).toString(),
                    timestamp: Number(timestamp),
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
            CREATE_NFT: async (args) => {
                const [to, tokenId, timestamp, floorPrice] = abiCoder.decode(["address", "uint", "uint", "uint"], args.data);
                console.log(to, tokenId, timestamp, floorPrice);
                const inputs: CreateNFTInput = {
                    address: to,
                    tokenId: Number(tokenId),
                    floorPrice: (floorPrice).toString(),
                    timestamp: Number(timestamp),
                };
                CreateNFTSchema.setEip712domain({
                    name: "bridge",
                    version: "1"
                })
                const signature = await signMessage(operator, CreateNFTSchema, inputs);
                const action = CreateNFTSchema.actionFrom({
                    inputs,
                    signature,
                    msgSender: operator.address,
                });
                return {
                    transitionName: "createNFT",
                    action,
                }
            }
        },
    });
    console.log("Waiting for BRIDGE_ETH event on the bridge contract...");

}
