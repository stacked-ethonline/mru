export interface Order {
    id: number;
    user: string;
    price: string;
    tokenId: number;
    timestamp: number;
}

export interface Stacked {
    users: {
        [key: string]: {
            ETH: string;
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
    floorPrice: string;
    NFT: NFT;
    createdAt: number;
}

export type CreateOrderInput = {
    price: string;
    tokenId: number;
    timestamp: number;
};

export type AddBalanceInput = {
    address: string;
    amount: string;
    timestamp: number;
}

export type CreateNFTInput = {
    address: string;
    tokenId: number;
    floorPrice: string;
    timestamp: number;
}