import {State} from "@stackr/sdk/machine";
import {constructTree} from "./tree";
import {Stacked} from "./types.ts";


export class StackedState extends State<Stacked> {
    constructor(state: Stacked) {
        super(state);
    }

    getRootHash() {
        const tree = constructTree(this.state);
        return tree.getHexRoot();
    }
}
