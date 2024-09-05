import {ActionSchema, SolidityType} from "@stackr/sdk";

export const CreateOrderSchema = new ActionSchema("createOrder", {
    timestamp: SolidityType.UINT,
});


export const schemas = {
    CreateOrderSchema
};
