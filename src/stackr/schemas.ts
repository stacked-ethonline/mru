import {ActionSchema, SolidityType} from "@stackr/sdk";

export const CreateOrderSchema = new ActionSchema("createOrder", {
    timestamp: SolidityType.UINT,
});

export const AddBalanceSchema = new ActionSchema("addBalance", {
    address: SolidityType.ADDRESS,
    amount: SolidityType.UINT,
})

export const schemas = {
    CreateOrderSchema,
    AddBalanceSchema
};
