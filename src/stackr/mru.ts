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
        post: ["sortOrders", "completeOrder"],
    },
});

await mru.init();

mru.events.subscribe(ConfirmationEvents.C1, async (args: any) => {
    // withdraw logic goes here
    console.log(args);
})

mru.events.subscribe(ConfirmationEvents.C3A, async (args: any) => {
    console.log(JSON.stringify(args));
    const {vulcanResponse} = args;
    const daMetadata = vulcanResponse?.batchInfo?.daMetadata;
    const data = await fetch(`https://avail-turing.subscan.io/extrinsic/${daMetadata?.avail?.blockHeight}-${daMetadata?.avail?.extIdx}`)

    console.log(data)

});

mru.events.subscribe(ConfirmationEvents.C0, async (args: any) => {
    console.log("hi")

});

mru.events.subscribe(ConfirmationEvents.C2, async (args: any) => {
    console.log("hi")

});

Playground.init(mru);

export {mru};
