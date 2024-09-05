import {Hook, Hooks} from "@stackr/sdk/machine";

import {StackedState} from "./state";

const sortOrders: Hook<StackedState> = {
    handler: ({state}) => {
        state.bids.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);
        console.log(state.bids)
        return state;
    },
};

export const hooks: Hooks<StackedState> = {
    sortOrders,
};