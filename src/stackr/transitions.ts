import {Transitions, STF, REQUIRE} from "@stackr/sdk/machine";

import {StackedState} from "./state";
import {AddBalanceInput, CreateNFTInput, CreateOrderInput, Order} from "./types";

const SECONDS_IN_24_HOURS = 86400;

const addBalance: STF<StackedState, AddBalanceInput> = {
    handler: ({state, inputs, block}) => {
        const {address, amount, timestamp} = inputs;
        REQUIRE(timestamp <= block.timestamp, "INVALID_TIMESTAMP");

        REQUIRE(amount > 0, "Invalid amount");

        let user = state.users[address];
        if (!user) {
            user = {
                ETH: 0,
                NFT: []
            }
        }
        user.ETH += amount;
        state.users[address] = user;
        return state
    }
}

const createOrder: STF<StackedState, CreateOrderInput> = {
    handler: ({state, inputs, msgSender, block, emit}) => {
        const actor = msgSender.toString();
        const {price, tokenId, timestamp} = inputs;
        REQUIRE(timestamp <= block.timestamp, "INVALID_TIMESTAMP");
        REQUIRE(price > 0, "Invalid price");
        const user = state.users[actor];
        REQUIRE(user !== undefined, "User not found");

        const currentTimestamp = Math.floor(Date.now() / 1000);

        const currentNft = state.NFTs.filter(nft => nft.NFT.tokenId === tokenId)[0]
        REQUIRE(price > currentNft.floorPrice, "Invalid price");
        REQUIRE(currentTimestamp - currentNft.createdAt > SECONDS_IN_24_HOURS && state.filledOrders.filter(order => order.tokenId === currentNft.NFT.tokenId).length === 0, "The auction has expired")
        const userActiveBidsTotal = Object.values(state.bids).flat()
            .filter((bid) => bid.user === actor)
            .reduce((acc, bid) => acc + bid.price, 0);
        REQUIRE(
            user.ETH >= userActiveBidsTotal + price,
            "INSUFFICIENT_BALANCE"
        );
        const order: Order = {
            id:
                state.bids[tokenId.toString()].length + state.filledOrders.length + 1,
            user: actor,
            tokenId,
            price,
            timestamp,
        };
        state.bids[tokenId.toString()].push(order);
        emit({name: "BidOrderCreated", value: order});
        return state;
    },
};

const createNFT: STF<StackedState, CreateNFTInput> = {
    handler: ({state, inputs, block}) => {
        const {address, floorPrice, tokenId, timestamp} = inputs;
        REQUIRE(timestamp <= block.timestamp, "INVALID_TIMESTAMP");
        REQUIRE(floorPrice > 0, "Invalid price");

        let user = state.users[address];
        if (!user) {
            user = {
                ETH: 0,
                NFT: []
            }
        }
        const nft = {
            tokenId,
            collectionOwner: address
        }
        user.NFT.push(nft)
        state.NFTs.push({
            floorPrice,
            createdAt: timestamp,
            NFT: nft
        })
        state.users[address] = user;
        return state;
    }
}

export const transitions: Transitions<StackedState> = {
    addBalance,
    createOrder,
    createNFT
};