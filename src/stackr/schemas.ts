import {ActionSchema, SolidityType} from "@stackr/sdk";

export const UpdateCounterSchema = new ActionSchema("update-counter", {
    timestamp: SolidityType.UINT,
});

export const CreateOrderSchema = new ActionSchema("createOrder", {
    orderType: SolidityType.STRING,
    price: SolidityType.UINT,
    quantity: SolidityType.UINT,
    timestamp: SolidityType.UINT,
});


export const schemas = {
    UpdateCounterSchema,
    CreateOrderSchema
};
