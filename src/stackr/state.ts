import {State} from "@stackr/sdk/machine";
import {StackedTree} from "./tree";
import {Stacked} from "./types.ts";
import {solidityPackedKeccak256} from "ethers";


export class StackedState extends State<Stacked, StackedTree> {
    constructor(state: Stacked) {
        super(state);
    }

    transformer() {
        return {
            wrap: () => {
                return new StackedTree(this.state);
            },
            unwrap: (wrappedState: StackedTree) => {
                return wrappedState.state;
            },
        };
    }



    getRootHash(): string {
        console.log(this.transformer().wrap().bidMerkleTree.getHexRoot(),
            this.transformer().wrap().filledOrderMerkleTree.getHexRoot(),
            this.transformer().wrap().nftMerkleTree.getHexRoot(),
            this.transformer().wrap().userMerkleTree.getHexRoot(),)
        return solidityPackedKeccak256(
            ["bytes32", "bytes32", "bytes32", "bytes32"],
            [
                this.transformer().wrap().bidMerkleTree.getHexRoot().padEnd(66, '0'),
                this.transformer().wrap().filledOrderMerkleTree.getHexRoot().padEnd(66, '0'),
                this.transformer().wrap().nftMerkleTree.getHexRoot().padEnd(66, '0'),
                this.transformer().wrap().userMerkleTree.getHexRoot().padEnd(66, '0'),
            ]
        );
    }
}
