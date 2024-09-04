import {STF, Transitions} from "@stackr/sdk/machine";
import {StackedState} from "./state";

const increment: STF<StackedState> = {
    handler: ({state, emit}) => {
        state += 1;
        if (state > 42) {
            throw new Error("Counter cannot exceed 42");
        }
        emit({name: "newState", value: state});
        return state;
    },
};

const decrement: STF<StackedState> = {
    handler: ({state, emit}) => {
        state -= 1;
        if (state < 0) {
            throw new Error("Counter cannot be negative");
        }
        emit({name: "newState", value: state});
        return state;
    },
};

export const transitions: Transitions<StackedState> = {
    increment,
    decrement,
};
