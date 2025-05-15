// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// This is a self-contained version of the TimeCapsuleReceiver contract
// with all dependencies included directly in the file for easy compilation in Remix

// ============ Origin struct for LayerZero messages ============
struct Origin {
    uint32 srcEid;      // source endpoint ID
    bytes32 sender;     // sender address from the source chain
    uint64 nonce;       // message nonce
}

// ============ Abstract OAPP contract for LayerZero compatibility ============
abstract contract OAPP {
    address immutable endpoint;
    address immutable oappOwner;
    
    constructor(address _endpoint, address _owner) {
        endpoint = _endpoint;
        oappOwner = _owner;
    }
    
    function _lzReceive(
        Origin memory _origin,
        bytes32 _guid,
        bytes memory _message,
        address _executor,
        bytes memory _extraData
    ) internal virtual;
    
    function lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external virtual {
        _lzReceive(_origin, _guid, _message, _executor, _extraData);
    }
}

// ============ ERC721 Implementation ============

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

// Events for the ERC721 standard
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

// ============ Base ERC721 implementation ============
contract ERC721 {
    // Token name
    string private _name;

    // Token symbol
    string private _symbol;

    // Mapping from token ID to owner address
    mapping(uint256 => address) private _owners;

    // Mapping owner address to token count
    mapping(address => uint256) private _balances;

    // Mapping from token ID to approved address
    mapping(uint256 => address) private _tokenApprovals;

    // Mapping from owner to operator approvals
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual returns (string memory) {
        return _name;
    }

    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    function tokenURI(uint256 tokenId) public view virtual returns (string memory) {
        require(_exists(tokenId), "ERC721: URI query for nonexistent token");
        return "";
    }

    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _owners[tokenId] != address(0);
    }

    function balanceOf(address owner) public view virtual returns (uint256) {
        require(owner != address(0), "ERC721: balance query for the zero address");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view virtual returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: owner query for nonexistent token");
        return owner;
    }

    function approve(address to, uint256 tokenId) public virtual {
        address owner = ownerOf(tokenId);
        require(to != owner, "ERC721: approval to current owner");
        
        require(
            msg.sender == owner || isApprovedForAll(owner, msg.sender),
            "ERC721: approve caller is not owner nor approved for all"
        );

        _approve(to, tokenId);
    }

    function getApproved(uint256 tokenId) public view virtual returns (address) {
        require(_exists(tokenId), "ERC721: approved query for nonexistent token");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public virtual {
        require(operator != msg.sender, "ERC721: approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view virtual returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public virtual {
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: transfer caller is not owner nor approved");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public virtual {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public virtual {
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: transfer caller is not owner nor approved");
        _safeTransfer(from, to, tokenId, data);
    }

    function _safeTransfer(address from, address to, uint256 tokenId, bytes memory data) internal virtual {
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view virtual returns (bool) {
        require(_exists(tokenId), "ERC721: operator query for nonexistent token");
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    function _mint(address to, uint256 tokenId) internal virtual {
        require(to != address(0), "ERC721: mint to the zero address");
        require(!_exists(tokenId), "ERC721: token already minted");

        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);
    }

    function _burn(uint256 tokenId) internal virtual {
        address owner = ownerOf(tokenId);
        _approve(address(0), tokenId);
        _balances[owner] -= 1;
        delete _owners[tokenId];
        emit Transfer(owner, address(0), tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal virtual {
        require(ownerOf(tokenId) == from, "ERC721: transfer of token that is not owned");
        require(to != address(0), "ERC721: transfer to the zero address");
        _approve(address(0), tokenId);
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function _approve(address to, uint256 tokenId) internal virtual {
        _tokenApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) private returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC721: transfer to non ERC721Receiver implementer");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }
}

// ============ ERC721 URI Storage extension ============
contract ERC721URIStorage is ERC721 {
    // Optional mapping for token URIs
    mapping(uint256 => string) private _tokenURIs;

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    function _baseURI() internal view virtual returns (string memory) {
        return "";
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721URIStorage: URI query for nonexistent token");

        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }

        return super.tokenURI(tokenId);
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "ERC721URIStorage: URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    function _burn(uint256 tokenId) internal virtual override {
        super._burn(tokenId);

        if (bytes(_tokenURIs[tokenId]).length != 0) {
            delete _tokenURIs[tokenId];
        }
    }
}

// ============ Ownable contract ============
contract Ownable {
    address private _owner;
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        _transferOwnership(initialOwner);
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// ============ Counters utilities ============
library Strings {
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

library Counters {
    struct Counter {
        uint256 _value; // default: 0
    }

    function current(Counter storage counter) internal view returns (uint256) {
        return counter._value;
    }

    function increment(Counter storage counter) internal {
        unchecked {
            counter._value += 1;
        }
    }
}

// ============ TimeCapsuleReceiver contract ============
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
    ) OAPP(_endpoint, _owner) ERC721URIStorage(_name, _symbol) Ownable(_owner) {
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
     * @dev Override the internal _exists function
     */
    function _exists(uint256 tokenId) internal view override returns (bool) {
        return _tokenExists[tokenId] || super._exists(tokenId);
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