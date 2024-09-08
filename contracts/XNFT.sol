// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {IAny2EVMMessageReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IAny2EVMMessageReceiver.sol";
import {OwnerIsCreator} from "@chainlink/contracts-ccip/src/v0.8/shared/access/OwnerIsCreator.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";

interface ITokenBridge {
    function createNFT(address to, uint256 tokenId, uint256 floorPrice) external;
}

contract XNFT is ERC721, ERC721URIStorage, ERC721Burnable, IAny2EVMMessageReceiver, ReentrancyGuard, OwnerIsCreator {
    using SafeERC20 for IERC20;

    enum PayFeesIn {
        Native,
        LINK
    }

    error InvalidRouter(address router);
    error OnlyOnSepolia();
    error NotEnoughBalanceForFees(uint256 currentBalance, uint256 calculatedFees);
    error NothingToWithdraw();
    error FailedToWithdrawEth(address owner, address target, uint256 value);
    error ChainNotEnabled(uint64 chainSelector);
    error SenderNotEnabled(address sender);
    error OperationNotAllowedOnCurrentChain(uint64 chainSelector);

    struct XNftDetails {
        address xNftAddress;
    }

    uint256 constant SEPOLIA_CHAIN_ID = 11155111;

    IRouterClient internal immutable i_ccipRouter;
    uint64 private immutable i_currentChainSelector;
    address private tokenBridge;

    uint256 private _nextTokenId;

    mapping(uint64 destChainSelector => XNftDetails xNftDetailsPerChain) public s_chains;

    event ChainEnabled(uint64 chainSelector, address xNftAddress);
    event ChainDisabled(uint64 chainSelector);
    event CrossChainSent(
        address from, address to, uint256 tokenId, uint64 sourceChainSelector, uint64 destinationChainSelector
    );
    event CrossChainReceived(
        address from, address to, uint256 tokenId, uint64 sourceChainSelector, uint64 destinationChainSelector
    );

    modifier onlyRouter() {
        if (msg.sender != address(i_ccipRouter)) {
            revert InvalidRouter(msg.sender);
        }
        _;
    }

    modifier onlyOnSepolia() {
        if (block.chainid != SEPOLIA_CHAIN_ID) {
            revert OnlyOnSepolia();
        }
        _;
    }

    modifier onlyEnabledChain(uint64 _chainSelector) {
        if (s_chains[_chainSelector].xNftAddress == address(0)) {
            revert ChainNotEnabled(_chainSelector);
        }
        _;
    }

    modifier onlyEnabledSender(uint64 _chainSelector, address _sender) {
        if (s_chains[_chainSelector].xNftAddress != _sender) {
            revert SenderNotEnabled(_sender);
        }
        _;
    }

    modifier onlyOtherChains(uint64 _chainSelector) {
        if (_chainSelector == i_currentChainSelector) {
            revert OperationNotAllowedOnCurrentChain(_chainSelector);
        }
        _;
    }

    constructor(address ccipRouterAddress, uint64 currentChainSelector, address _tokenBridge)
    ERC721("Stacked NFT", "sNFT")
    {
        if (ccipRouterAddress == address(0)) revert InvalidRouter(address(0));
        i_ccipRouter = IRouterClient(ccipRouterAddress);
        i_currentChainSelector = currentChainSelector;
        tokenBridge = _tokenBridge;
    }

    function mint(address to, string memory _tokenURI, uint256 floorPrice) external onlyOnSepolia {
        uint256 tokenId = _nextTokenId++;
        _safeMint(address(this), tokenId);
        _setTokenURI(tokenId, _tokenURI);
        ITokenBridge(tokenBridge).createNFT(to, tokenId, floorPrice);
    }

    function enableChain(uint64 chainSelector, address xNftAddress)
    external
    onlyOwner
    onlyOtherChains(chainSelector)
    {
        s_chains[chainSelector] = XNftDetails({xNftAddress: xNftAddress});

        emit ChainEnabled(chainSelector, xNftAddress);
    }

    function disableChain(uint64 chainSelector) external onlyOwner onlyOtherChains(chainSelector) {
        delete s_chains[chainSelector];

        emit ChainDisabled(chainSelector);
    }

    function crossChainMint(
        address from,
        address to,
        string memory tokenUri,
        uint64 destinationChainSelector,
        uint256 floorPrice
    ) external nonReentrant onlyEnabledChain(destinationChainSelector) returns (bytes32 messageId) {

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(s_chains[destinationChainSelector].xNftAddress),
            data: abi.encode(from, _nextTokenId, tokenUri, 1),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 980_000})
            ),
            feeToken: address(0)
        });

        // Get the fee required to send the CCIP message
        uint256 fees = i_ccipRouter.getFee(destinationChainSelector, message);
        if (fees > address(this).balance) {
            revert NotEnoughBalanceForFees(address(this).balance, fees);
        }

        // Send the message through the router and store the returned message ID
        messageId = i_ccipRouter.ccipSend{value: fees}(destinationChainSelector, message);
        ITokenBridge(tokenBridge).createNFT(to, _nextTokenId, floorPrice);

        emit CrossChainSent(from, to, _nextTokenId++, i_currentChainSelector, destinationChainSelector);
    }

    /// @inheritdoc IAny2EVMMessageReceiver
    function ccipReceive(Client.Any2EVMMessage calldata message)
    external
    virtual
    override
    onlyRouter
    nonReentrant
    onlyEnabledChain(message.sourceChainSelector)
    onlyEnabledSender(message.sourceChainSelector, abi.decode(message.sender, (address)))
    {
        uint64 sourceChainSelector = message.sourceChainSelector;
        (address add, uint256 tokenId, string memory tokenUri, uint256 txnType) =
                            abi.decode(message.data, (address, uint256, string, uint256));
        if (txnType == 1) {
            _safeMint(address(this), tokenId);
            _setTokenURI(tokenId, tokenUri);
        } else if (txnType == 2) {
            transferFrom(address(this), add, tokenId);
        }

        emit CrossChainReceived(add, address(this), tokenId, sourceChainSelector, i_currentChainSelector);
    }

    function withdraw(address _beneficiary) public onlyOwner {
        uint256 amount = address(this).balance;

        if (amount == 0) revert NothingToWithdraw();

        (bool sent,) = _beneficiary.call{value: amount}("");

        if (!sent) revert FailedToWithdrawEth(msg.sender, _beneficiary, amount);
    }

    function withdrawToken(address _beneficiary, address _token) public onlyOwner {
        uint256 amount = IERC20(_token).balanceOf(address(this));

        if (amount == 0) revert NothingToWithdraw();

        IERC20(_token).safeTransfer(_beneficiary, amount);
    }

    function withdrawNFT(address to, uint256 tokenId, uint64 destinationChainSelector) public onlyOwner {
        if (destinationChainSelector == i_currentChainSelector) {
            transferFrom(address(this), to, tokenId);
        } else {
            Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
                receiver: abi.encode(s_chains[destinationChainSelector].xNftAddress),
                data: abi.encode(to, tokenId, "", 2),
                tokenAmounts: new Client.EVMTokenAmount[](0),
                extraArgs: Client._argsToBytes(
                    Client.EVMExtraArgsV1({gasLimit: 980_000})
                ),
                feeToken: address(0)
            });

            // Get the fee required to send the CCIP message
            uint256 fees = i_ccipRouter.getFee(destinationChainSelector, message);
            if (fees > address(this).balance) {
                revert NotEnoughBalanceForFees(address(this).balance, fees);
            }
        }
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function getCCIPRouter() public view returns (address) {
        return address(i_ccipRouter);
    }

    function setBridge(address _tokenBridge) public onlyOwner {
        tokenBridge = _tokenBridge;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return interfaceId == type(IAny2EVMMessageReceiver).interfaceId || super.supportsInterface(interfaceId);
    }
}