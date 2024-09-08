import {Hook, Hooks} from "@stackr/sdk/machine";

import {StackedState} from "./state";

const SECONDS_IN_24_HOURS = 86400;

const sortOrders: Hook<StackedState> = {
    handler: ({state}) => {
        Object.keys(state.state.bids).forEach((key) => {
            state.state.bids[key].sort((a, b) => {
                const priceComparison = BigInt(b.price) - BigInt(a.price);

                if (priceComparison !== 0n) {
                    return priceComparison > 0n ? 1 : -1;
                }

                return a.timestamp - b.timestamp;
            });
        });

        console.log(state.state.bids);
        return state;
    },
};

const completeOrder: Hook<StackedState> = {
    handler: ({state}) => {
        state.state.NFTs.map((nft) => {
            const currentTimestamp = Math.floor(Date.now() / 1000);
            if (currentTimestamp - nft.createdAt > SECONDS_IN_24_HOURS && state.state.filledOrders.filter(order => order.tokenId === nft.NFT.tokenId).length === 0) {
                const highestBid = state.state.bids[nft.NFT.tokenId.toString()][0];

                console.log(highestBid)
                const buyer = state.state.users[highestBid.user]
                console.log(buyer)
                const owner = state.state.users[nft.NFT.collectionOwner]
                console.log(owner)
                buyer.ETH = (BigInt(buyer.ETH) - BigInt(highestBid.price)).toString();
                buyer.NFT.push(nft.NFT);

                owner.NFT = state.state.users[nft.NFT.collectionOwner].NFT.filter(ownerNft => ownerNft.tokenId !== nft.NFT.tokenId);
                owner.ETH = (BigInt(owner.ETH) + BigInt(highestBid.price)).toString();

                state.state.users[highestBid.user] = buyer;
                state.state.filledOrders.push(highestBid)
            }
        })
        return state;
    }
}

export const hooks: Hooks<StackedState> = {
    sortOrders,
    completeOrder
};