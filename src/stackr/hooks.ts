import {Hook, Hooks} from "@stackr/sdk/machine";

import {StackedState} from "./state";

const sortOrders: Hook<StackedState> = {
    handler: ({state}) => {
        console.log(state);
        state++;
        return state;
    },
};

export const hooks: Hooks<StackedState> = {
    sortOrders,
};