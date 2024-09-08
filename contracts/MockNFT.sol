// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract MockNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 nextTokenId;

    event NFTMinted(address indexed to, uint256 indexed tokenId, uint256 floorPrice);

    constructor() ERC721("MockNFT", "mNFT") Ownable(msg.sender){
    }

    function mint(string memory _tokenURI) public {
        _safeMint(address(this), nextTokenId);
        _setTokenURI(nextTokenId++, _tokenURI);
    }

    function withdrawNFT(address to, uint256 tokenId) public onlyOwner {
        transferFrom(address(this), to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
}