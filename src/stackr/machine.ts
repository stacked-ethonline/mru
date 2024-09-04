import {StateMachine} from "@stackr/sdk/machine";

import * as genesisState from "../../genesis-state.json";
import {StackedState} from "./state";
import {transitions} from "./transitions";
import {hooks} from "./hooks.ts";

const stackedMachine = new StateMachine({
    id: "stacked",
    stateClass: StackedState,
    initialState: genesisState.state,
    on: transitions,
    hooks,
});

export {stackedMachine};
