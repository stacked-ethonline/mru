// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {MockNFT} from "./TokenBridge.sol";

interface ITicketFactory {
    function createTicket(
        bytes32 _identifier,
        address _msgSender,
        bytes memory _message
    ) external;
}

contract TokenBridge {
    address appInbox;
    MockNFT private nft;
    constructor(address _appInbox, address _nft) {
        appInbox = _appInbox;
        nft = MockNFT(_nft);
    }

    function createNFT(address to, uint256 tokenId, uint256 floorPrice, string memory tokenURI) external {
        require(to != address(0), "createNFT/zero-address");

        bytes memory message = abi.encode(to, tokenId, block.timestamp, floorPrice);
        bytes32 identifier = keccak256("CREATE_NFT");

        ITicketFactory(appInbox).createTicket(
            identifier,
            msg.sender,
            message
        );
        nft.mint(tokenURI);
    }

    function bridgeETH(address _to) external payable {
        require(_to != address(0), "bridgeTokens/zero-address");
        require(msg.value > 0, "bridgeTokens/zero-amount");

        bytes memory message = abi.encode(_to, msg.value, block.timestamp);
        bytes32 identifier = keccak256("BRIDGE_ETH");

        ITicketFactory(appInbox).createTicket(
            identifier,
            msg.sender,
            message
        );
    }

    function setAppInbox(address _appInbox) public {
        appInbox = _appInbox;
    }
}