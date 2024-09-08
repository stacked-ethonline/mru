import {ActionSchema, SolidityType} from "@stackr/sdk";

export const CreateOrderSchema = new ActionSchema("createOrder", {
    price: SolidityType.STRING,
    tokenId: SolidityType.UINT,
    timestamp: SolidityType.UINT,
});

export const AddBalanceSchema = new ActionSchema("addBalance", {
    address: SolidityType.ADDRESS,
    amount: SolidityType.STRING,
    timestamp: SolidityType.UINT,
})

export const CreateNFTSchema = new ActionSchema("createNFT", {
    address: SolidityType.ADDRESS,
    tokenId: SolidityType.UINT,
    floorPrice: SolidityType.STRING,
    timestamp: SolidityType.UINT,
})

export const schemas = {
    CreateOrderSchema,
    AddBalanceSchema,
    CreateNFTSchema
};
