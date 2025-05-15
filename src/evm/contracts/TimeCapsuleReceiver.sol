// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./OAPP.sol";

/**
 * @title TimeCapsuleReceiver
 * @dev Receives messages from a Solana Time Capsule program via LayerZero V2
 * and mints an NFT to represent the unlocked time capsule
 */
contract TimeCapsuleReceiver is OAPP, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Enum to track the type of capsule content
    enum CapsuleType {
        Text,
        Token,
        NFT
    }

    // Structure to store information about a time capsule release
    struct CapsuleRelease {
        address owner;
        uint64 unlockedAt;
        uint64 createdAt;
        CapsuleType capsuleType;
        string content; // Optional content for text messages
    }

    // Mapping from token ID to release info
    mapping(uint256 => CapsuleRelease) public releases;

    // Base URI for token metadata
    string private _baseTokenURI;

    // Origin chain ID mapping (for allowed sources)
    mapping(uint32 => bool) public allowedOrigins;

    // Add a mapping to keep track of token existence since _exists may not be accessible
    mapping(uint256 => bool) private _tokenExists;

    // Events
    event CapsuleReceived(
        uint256 indexed tokenId,
        address indexed owner,
        uint64 unlockedAt,
        CapsuleType capsuleType
    );

    /**
     * @dev Constructor for TimeCapsuleReceiver
     * @param _endpoint LayerZero endpoint address
     * @param _owner Owner of the contract
     */
    constructor(
        address _endpoint, 
        address _owner,
        string memory _name,
        string memory _symbol
    ) OAPP(_endpoint, _owner) ERC721(_name, _symbol) Ownable(_owner) {
    }

    /**
     * @dev Sets the base URI for token metadata
     * @param baseURI The base URI to set
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Adds or removes an origin chain to allowed origins
     * @param originChainId The LayerZero chain ID of the origin chain
     * @param allowed Whether to allow or disallow the origin
     */
    function setAllowedOrigin(uint32 originChainId, bool allowed) external onlyOwner {
        allowedOrigins[originChainId] = allowed;
    }

    /**
     * @dev Function to mint a new token when a time capsule is unlocked
     * @param to The address that will own the minted token
     * @param unlockedAt The timestamp when the capsule was unlocked
     * @param createdAt The timestamp when the capsule was created
     * @param capsuleType The type of capsule (Text, Token, NFT)
     * @param content Optional content for text messages
     * @return The ID of the newly minted token
     */
    function mint(
        address to,
        uint64 unlockedAt,
        uint64 createdAt,
        CapsuleType capsuleType,
        string memory content
    ) internal returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(to, newTokenId);
        _tokenExists[newTokenId] = true; // Mark token as existing

        // Store release information
        releases[newTokenId] = CapsuleRelease({
            owner: to,
            unlockedAt: unlockedAt,
            createdAt: createdAt,
            capsuleType: capsuleType,
            content: content
        });

        // Generate token URI based on token data
        // This could be enhanced with dynamic metadata generation
        string memory tokenURI = string(
            abi.encodePacked(
                _baseTokenURI, 
                Strings.toString(newTokenId)
            )
        );
        _setTokenURI(newTokenId, tokenURI);

        emit CapsuleReceived(newTokenId, to, unlockedAt, capsuleType);

        return newTokenId;
    }

    /**
     * @dev Checks if the token exists
     * @param tokenId ID of the token to check
     * @return bool whether the token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _tokenExists[tokenId];
    }

    /**
     * @dev LayerZero lzReceive handler
     * @param _origin The origin endpoint and sender address
     * @param _guid The guid for the LayerZero message
     * @param _message The message payload
     * @param _executor The address of the executor
     * @param _extraData Additional data
     */
    function _lzReceive(
        Origin memory _origin,
        bytes32 _guid,
        bytes memory _message,
        address _executor,
        bytes memory _extraData
    ) internal override {
        // Verify origin chain is allowed
        require(allowedOrigins[_origin.srcEid], "TimeCapsuleReceiver: origin not allowed");

        // Decode the message
        (
            address owner,
            uint64 unlockedAt,
            uint64 createdAt,
            uint8 capsuleTypeCode,
            string memory content
        ) = abi.decode(_message, (address, uint64, uint64, uint8, string));

        // Map the capsule type from uint8 to enum
        CapsuleType capsuleType;
        if (capsuleTypeCode == 0) {
            capsuleType = CapsuleType.Text;
        } else if (capsuleTypeCode == 1) {
            capsuleType = CapsuleType.Token;
        } else if (capsuleTypeCode == 2) {
            capsuleType = CapsuleType.NFT;
        } else {
            revert("TimeCapsuleReceiver: invalid capsule type");
        }

        // Mint a new token to represent the unlocked time capsule
        mint(owner, unlockedAt, createdAt, capsuleType, content);
    }

    /**
     * @dev Returns the base URI for token metadata
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Returns information about a released time capsule
     * @param tokenId The ID of the token representing the time capsule
     * @return Information about the release
     */
    function getReleaseInfo(uint256 tokenId) public view returns (CapsuleRelease memory) {
        require(_exists(tokenId), "TimeCapsuleReceiver: query for nonexistent token");
        return releases[tokenId];
    }
} 