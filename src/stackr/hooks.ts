import {Hook, Hooks} from "@stackr/sdk/machine";

import {StackedState} from "./state";

const SECONDS_IN_24_HOURS = 86400;

const sortOrders: Hook<StackedState> = {
    handler: ({state}) => {
        Object.keys(state.bids).forEach((key) => {
            state.bids[(key)].sort((a, b) => {
                return b.price - a.price || a.timestamp - b.timestamp;
            });
        });

        console.log(state.bids);
        return state;
    },
};

const completeOrder: Hook<StackedState> = {
    handler: ({state}) => {
        state.NFTs.map((nft) => {
            const currentTimestamp = Math.floor(Date.now() / 1000);
            if (currentTimestamp - nft.createdAt > SECONDS_IN_24_HOURS && state.filledOrders.filter(order => order.tokenId === nft.NFT.tokenId).length === 0) {
                const highestBid = state.bids[nft.NFT.tokenId.toString()][0];

                console.log(highestBid)
                const buyer = state.users[highestBid.user]
                console.log(buyer)
                const owner = state.users[nft.NFT.collectionOwner]
                console.log(owner)
                buyer.ETH -= highestBid.price;
                buyer.NFT.push(nft.NFT);

                owner.NFT = state.users[nft.NFT.collectionOwner].NFT.filter(ownerNft => ownerNft.tokenId !== nft.NFT.tokenId);
                owner.ETH += highestBid.price;

                state.users[highestBid.user] = buyer;
                state.filledOrders.push(highestBid)
            }
        })
        return state;
    }
}

export const hooks: Hooks<StackedState> = {
    sortOrders,
    completeOrder
};