import {Transitions, STF, REQUIRE} from "@stackr/sdk/machine";

import {StackedState} from "./state";
import {AddBalanceInput, CreateNFTInput, CreateOrderInput, Order} from "./types";

const SECONDS_IN_24_HOURS = 86400;

const addBalance: STF<StackedState, AddBalanceInput> = {
    handler: ({state, inputs, block}) => {
        const {address, amount, timestamp} = inputs;
        REQUIRE(timestamp <= block.timestamp, "INVALID_TIMESTAMP");

        REQUIRE(BigInt(amount) > 0n, "Invalid amount");

        let user = state.state.users[address];
        if (!user) {
            user = {
                ETH: "0",
                NFT: []
            }
        }
        user.ETH = (BigInt(user.ETH) + BigInt(amount)).toString();
        state.state.users[address] = user;
        return state
    }
}

const createOrder: STF<StackedState, CreateOrderInput> = {
    handler: ({state, inputs, msgSender, block, emit}) => {
        const actor = msgSender.toString();
        const {price, tokenId, timestamp} = inputs;
        REQUIRE(timestamp <= block.timestamp, "INVALID_TIMESTAMP");
        REQUIRE(BigInt(price) > 0n, "Invalid price");
        const user = state.state.users[actor];
        REQUIRE(user !== undefined, "User not found");

        const currentTimestamp = Math.floor(Date.now() / 1000);

        const currentNft = state.state.NFTs.filter(nft => nft.NFT.tokenId === tokenId)[0]
        REQUIRE(BigInt(price) > BigInt(currentNft.floorPrice), "Invalid price");
        REQUIRE((currentTimestamp - currentNft.createdAt < SECONDS_IN_24_HOURS) && state.state.filledOrders.filter(order => order.tokenId === currentNft.NFT.tokenId).length === 0, "The auction has expired")
        const userActiveBidsTotal = Object.values(state.state.bids).flat()
            .filter((bid) => bid.user === actor)
            .reduce((acc, bid) => acc + BigInt(bid.price), 0n);
        REQUIRE(
            BigInt(user.ETH) >= userActiveBidsTotal + BigInt(price),
            "INSUFFICIENT_BALANCE"
        );
        if (!state.state.bids[tokenId.toString()]) state.state.bids[tokenId.toString()] = [];

        const order: Order = {
            id:
                state.state.bids[tokenId.toString()].length + state.state.filledOrders.length + 1,
            user: actor,
            tokenId,
            price,
            timestamp,
        };
        state.state.bids[tokenId.toString()].push(order);
        // emit({name: "BidOrderCreated", value: order});
        return state;
    },
};

const createNFT: STF<StackedState, CreateNFTInput> = {
    handler: ({state, inputs, block}) => {
        const {address, floorPrice, tokenId, timestamp} = inputs;
        REQUIRE(timestamp <= block.timestamp, "INVALID_TIMESTAMP");
        REQUIRE(BigInt(floorPrice) > 0n, "Invalid price");

        let user = state.state.users[address];
        if (!user) {
            user = {
                ETH: "0",
                NFT: []
            }
        }
        const nft = {
            tokenId,
            collectionOwner: address
        }
        user.NFT.push(nft)
        state.state.NFTs.push({
            floorPrice,
            createdAt: timestamp,
            NFT: nft
        })
        state.state.users[address] = user;
        return state;
    }
}

export const transitions: Transitions<StackedState> = {
    addBalance,
    createOrder,
    createNFT
};