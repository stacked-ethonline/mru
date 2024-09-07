export interface Order {
    id: number;
    user: string;
    price: number;
    tokenId: number;
    timestamp: number;
}

export interface Stacked {
    users: {
        [key: string]: {
            ETH: number;
            NFT: NFT[];
        };
    };
    bids: {
        [key: string]: Order[];
    };
    filledOrders: Order[];
    NFTs: NFTDetails[];
}

export interface NFT {
    tokenId: number;
    collectionOwner: string;
}

export interface NFTDetails {
    floorPrice: number;
    NFT: NFT;
    createdAt: number;
}

export type CreateOrderInput = {
    price: number;
    tokenId: number;
    timestamp: number;
};

export type AddBalanceInput = {
    address: string;
    amount: number;
    timestamp: number;
}

export type CreateNFTInput = {
    address: string;
    tokenId: number;
    floorPrice: number;
    timestamp: number;
}