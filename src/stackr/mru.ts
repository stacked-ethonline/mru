import {ConfirmationEvents, MicroRollup} from "@stackr/sdk";
import {stackrConfig} from "../../stackr.config";
import {stackedMachine} from "./machine";
import {Playground} from "@stackr/sdk/plugins";
import {AddBalanceSchema, CreateNFTSchema, CreateOrderSchema} from "./schemas.ts";

const mru = await MicroRollup({
    config: stackrConfig,
    actionSchemas: [CreateOrderSchema, AddBalanceSchema, CreateNFTSchema],
    stateMachines: [stackedMachine],
    stfSchemaMap: {
        createOrder: CreateOrderSchema,
        addBalance: AddBalanceSchema,
        createNFT: CreateNFTSchema
    },
    blockHooks: {
        pre: ["completeOrder"],
        post: ["sortOrders"],
    },
});

await mru.init();

Playground.init(mru);

export {mru};
