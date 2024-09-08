import { solidityPackedKeccak256 } from "ethers";
import { MerkleTree } from "merkletreejs";
import { Stacked } from "./types.ts";

export class StackedTree {
    public state: Stacked;

    public userMerkleTree: MerkleTree;
    public bidMerkleTree: MerkleTree;
    public nftMerkleTree: MerkleTree;
    public filledOrderMerkleTree: MerkleTree;

    constructor(state: Stacked) {
        const {
            userMerkleTree,
            bidMerkleTree,
            nftMerkleTree,
            filledOrderMerkleTree,
        } = this.createTrees(state);

        this.userMerkleTree = userMerkleTree;
        this.bidMerkleTree = bidMerkleTree;
        this.nftMerkleTree = nftMerkleTree;
        this.filledOrderMerkleTree = filledOrderMerkleTree;

        this.state = state;
    }

    createTrees(state: Stacked) {
        const userHashes = Object.entries(state.users).map(([address, assets]) =>

                solidityPackedKeccak256(
                    ["address", "uint256", "bytes32[]"],
                    [
                        address,
                        assets.ETH,
                        state.users[address].NFT.map((nft) =>
                            solidityPackedKeccak256(["uint256"], [nft.tokenId])
                        ),
                    ]
                )
        );

        const bidHashes = Object.entries(state.bids).flatMap(([tokenId, orders]) =>
            orders.map(({ id, user, price, timestamp }) =>

                    solidityPackedKeccak256(
                        ["uint256", "address", "uint256", "uint256", "uint256"],
                        [id, user, Number(price), timestamp, Number(tokenId)]
                    )
            )
        );

        const nftHashes = state.NFTs.map(({ floorPrice, NFT, createdAt }) =>

                solidityPackedKeccak256(
                    ["uint256", "uint256", "address", "uint256"],
                    [Number(floorPrice), NFT.tokenId, NFT.collectionOwner, createdAt]
                )
        );

        const filledOrderHashes = state.filledOrders.map(
            ({ id, user, price, timestamp, tokenId }) =>

                    solidityPackedKeccak256(
                        ["uint256", "address", "uint256", "uint256", "uint256"],
                        [id, user, Number(price), timestamp, tokenId]
                    )
        );

        return {
            userMerkleTree: new MerkleTree(userHashes),
            bidMerkleTree: new MerkleTree(bidHashes),
            nftMerkleTree: new MerkleTree(nftHashes),
            filledOrderMerkleTree: new MerkleTree(filledOrderHashes),
        };
    }

    getRoots() {
        return {
            usersRoot: this.userMerkleTree.getHexRoot(),
            bidsRoot: this.bidMerkleTree.getHexRoot(),
            nftsRoot: this.nftMerkleTree.getHexRoot(),
            filledOrdersRoot: this.filledOrderMerkleTree.getHexRoot(),
        };
    }
}
