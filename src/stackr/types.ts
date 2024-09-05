export interface Order {
    id: number;
    user: string;
    price: number;
    timestamp: number;
}

export interface Stacked {
    users: {
        [key: string]: {
            ETH: number;
            NFT: NFT;
        };
    };
    bids: Order[];
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
}

export type CreateOrderInput = {
    price: number;
    timestamp: number;
};

export type CreateNFTInput = {
    floorPrice: number;
}