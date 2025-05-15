// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// Simplified version of the LayerZero OAPP interface for Remix
// This is intended to replace the import from @layerzerolabs/lz-evm-sdk-v2/contracts/libs/OAPP.sol

/**
 * @title Origin struct to represent the source of a LayerZero message
 */
struct Origin {
    uint32 srcEid;      // source endpoint ID
    bytes32 sender;     // sender address from the source chain
    uint64 nonce;       // message nonce
}

/**
 * @title Simplified OAPP (Origin Application) abstract contract
 * @dev Base contract for cross-chain applications using LayerZero
 */
abstract contract OAPP {
    address immutable endpoint;
    address immutable oappOwner;
    
    constructor(address _endpoint, address _owner) {
        endpoint = _endpoint;
        oappOwner = _owner;
    }
    
    /**
     * @dev Internal function to be implemented by the derived contract
     * @param _origin The origin information
     * @param _guid The message guid
     * @param _message The message bytes
     * @param _executor The executor address
     * @param _extraData Additional data
     */
    function _lzReceive(
        Origin memory _origin,
        bytes32 _guid,
        bytes memory _message,
        address _executor,
        bytes memory _extraData
    ) internal virtual;
    
    /**
     * @dev External function that can receive LayerZero messages
     * This would be called by the LayerZero endpoint in a real implementation
     */
    function lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external virtual {
        // In a real implementation, there would be access control here
        // to ensure only the LayerZero endpoint can call this function
        _lzReceive(_origin, _guid, _message, _executor, _extraData);
    }
} 