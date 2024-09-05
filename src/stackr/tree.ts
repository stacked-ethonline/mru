import {solidityPackedKeccak256} from "ethers";
import {MerkleTree} from "merkletreejs";

import {Stacked} from "./types.ts";

export const constructTree = (state: Stacked): MerkleTree => {
    const userHashes = Object.entries(state.users).map(([address, assets]) =>
        solidityPackedKeccak256(
            ["address", "uint256", "bytes32[]"],
            [address, assets.ETH, state.users[address].NFT.map((nft) =>
                solidityPackedKeccak256(["uint256"], [nft.tokenId])
            )]
        )
    );
    const bidHashes = state.bids.map(
        ({id, user, price, timestamp}) =>
            solidityPackedKeccak256(
                ["uint256", "address", "uint256", "uint256"],
                [id, user, price, timestamp]
            )
    );
    const nftHashes = state.NFTs.map(
        ({floorPrice, NFT}) =>
            solidityPackedKeccak256(
                ["uint256", "uint256", "address"],
                [floorPrice, NFT.tokenId, NFT.collectionOwner]
            )
    )
    const filledOrderHashes = state.filledOrders.map(
        ({id, user, price, timestamp}) =>
            solidityPackedKeccak256(
                ["uint256", "address", "uint256", "uint256"],
                [id, user, price, timestamp]
            )
    );
    const usersRoot = new MerkleTree(userHashes).getHexRoot();
    const bidsRoot = new MerkleTree(bidHashes).getHexRoot();
    const nftsRoot = new MerkleTree(nftHashes).getHexRoot();
    const filledOrdersRoot = new MerkleTree(filledOrderHashes).getHexRoot();
    return new MerkleTree([usersRoot, bidsRoot, nftsRoot, filledOrdersRoot]);
};