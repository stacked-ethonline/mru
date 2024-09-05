import {Transitions, STF, REQUIRE} from "@stackr/sdk/machine";

import {StackedState} from "./state";
import {AddBalanceInput, CreateOrderInput, Order} from "./types";

const addBalance: STF<StackedState, AddBalanceInput> = {
    handler: ({state, inputs}) => {
        const {address, amount} = inputs;
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
        const {price, timestamp} = inputs;
        REQUIRE(timestamp <= block.timestamp, "INVALID_TIMESTAMP");
        REQUIRE(price > 0, "Invalid price");
        const user = state.users[actor];
        REQUIRE(user !== undefined, "User not found");
        const userActiveBidsTotal = state.bids
            .filter((bid) => bid.user === actor)
            .reduce((acc, bid) => acc + bid.price, 0);
        REQUIRE(
            user.ETH >= userActiveBidsTotal + price,
            "INSUFFICIENT_BALANCE"
        );
        const order: Order = {
            id:
                state.bids.length + state.filledOrders.length + 1,
            user: actor,
            price,
            timestamp,
        };
        state.bids.push(order);
        emit({name: "BidOrderCreated", value: order});
        return state;
    },
};

export const transitions: Transitions<StackedState> = {
    addBalance,
    createOrder,
};