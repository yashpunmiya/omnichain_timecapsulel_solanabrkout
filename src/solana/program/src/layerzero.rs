// This module provides integration with the LayerZero V2 protocol for Solana
// It's a simplified implementation that would need to be replaced with actual
// LayerZero Solana SDK code in a production environment

use anchor_lang::prelude::*;
use anchor_lang::solana_program::account_info::AccountInfo;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
use anchor_lang::solana_program::pubkey::Pubkey;

// Placeholder for LayerZero endpoint account
pub struct LayerZeroEndpoint<'info> {
    pub account: AccountInfo<'info>,
}

// Structure for destination chain address
pub struct DestinationAddress {
    pub chain_id: u16,
    pub address: [u8; 32],
}

// Message payload structure
pub struct MessagePayload {
    pub owner: Pubkey,          // Owner of the time capsule
    pub unlock_timestamp: i64,  // When the capsule was unlocked
    pub creation_timestamp: i64, // When the capsule was created
    pub capsule_type: u8,       // Type of capsule (text, token, NFT)
    pub message: String,        // Content for text capsules
}

// Implementation to handle sending messages via LayerZero
pub fn send_message<'a>(
    endpoint: &AccountInfo<'a>,
    destination: DestinationAddress,
    payload: MessagePayload,
    gas_fee: u64,
    payer: &AccountInfo<'a>,
) -> Result<()> {
    // Convert payload to bytes
    let serialized_payload = serialize_payload(&payload)?;
    
    // First emit event for tracking - do this regardless of success
    emit!(LayerZeroMessageSent {
        destination_chain_id: destination.chain_id,
        payload_length: serialized_payload.len() as u32,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    // In Solana Playground, we might want to just log the intent rather than actually sending
    // This helps with testing/deployment without requiring actual LayerZero endpoint interaction
    msg!("LayerZero message prepared for chain {}: payload size {}", 
         destination.chain_id, serialized_payload.len());
    
    // For playground testing, just return success
    // In production, uncomment the following code
    /*
    // Create an instruction that will call the LayerZero endpoint
    // Use the actual discriminator that LayerZero V2 endpoint expects
    let send_discriminator = [97, 101, 109, 111, 110, 101, 121, 102]; // "aemoneyf" for "sendMessage" function
    
    // Create instruction data
    let mut instruction_data = Vec::with_capacity(8 + 2 + 32 + serialized_payload.len());
    
    // Add discriminator
    instruction_data.extend_from_slice(&send_discriminator);
    
    // Add destination chain ID (2 bytes)
    instruction_data.extend_from_slice(&destination.chain_id.to_le_bytes());
    
    // Add destination address (32 bytes)
    instruction_data.extend_from_slice(&destination.address);
    
    // Add payload
    instruction_data.extend_from_slice(&serialized_payload);
    
    // Create the accounts for the instruction
    let accounts = vec![
        AccountMeta::new(*endpoint.key, false),   // LayerZero endpoint (not a signer)
        AccountMeta::new(*payer.key, true),       // Payer (signer)
        // Add any other accounts required by the LayerZero endpoint
    ];
    
    // Create the instruction
    let endpoint_instruction = Instruction {
        program_id: *endpoint.key,  // The LayerZero endpoint program ID
        accounts,
        data: instruction_data,
    };
    
    // Invoke the LayerZero endpoint program
    let account_infos = vec![
        endpoint.clone(),
        payer.clone(),
    ];
    
    // Try to invoke the program
    match invoke(&endpoint_instruction, &account_infos) {
        Ok(_) => {
            msg!("Successfully sent LayerZero message to chain {}", destination.chain_id);
        },
        Err(err) => {
            msg!("Failed to send LayerZero message: {:?}", err);
            // We've already emitted the event at the beginning
            return Err(err.into());
        }
    }
    */
    
    Ok(())
}

// Helper function to serialize message payload
fn serialize_payload(payload: &MessagePayload) -> Result<Vec<u8>> {
    // Use abi.encode equivalent for Solana to match EVM decoding
    
    // Convert Pubkey to Ethereum address format (20 bytes)
    let owner_bytes = payload.owner.to_bytes()[0..20].to_vec();
    
    // Create an ABI-encoded compatible payload
    let mut result = Vec::with_capacity(100 + payload.message.len());
    
    // Pack data in a way that matches Solidity's abi.decode
    // First 20 bytes: address (owner)
    result.extend_from_slice(&[0; 12]); // Pad to 32 bytes
    result.extend_from_slice(&owner_bytes);
    
    // Next 32 bytes: uint64 (unlockedAt)
    let mut unlock_time_padded = [0u8; 32];
    unlock_time_padded[24..32].copy_from_slice(&payload.unlock_timestamp.to_be_bytes());
    result.extend_from_slice(&unlock_time_padded);
    
    // Next 32 bytes: uint64 (createdAt)
    let mut created_time_padded = [0u8; 32];
    created_time_padded[24..32].copy_from_slice(&payload.creation_timestamp.to_be_bytes());
    result.extend_from_slice(&created_time_padded);
    
    // Next 32 bytes: uint8 (capsuleType)
    let mut capsule_type_padded = [0u8; 32];
    capsule_type_padded[31] = payload.capsule_type;
    result.extend_from_slice(&capsule_type_padded);
    
    // String encoding: first the offset (32 bytes pointing to string location)
    let offset: u32 = 32 * 5; // 5 parameters before string data
    let mut offset_padded = [0u8; 32];
    offset_padded[28..32].copy_from_slice(&offset.to_be_bytes());
    result.extend_from_slice(&offset_padded);
    
    // String length (32 bytes)
    let string_length = payload.message.len();
    let mut length_padded = [0u8; 32];
    length_padded[28..32].copy_from_slice(&(string_length as u32).to_be_bytes());
    result.extend_from_slice(&length_padded);
    
    // String data
    let message_bytes = payload.message.as_bytes();
    result.extend_from_slice(message_bytes);
    
    // Pad string to multiple of 32 bytes
    let padding_needed = (32 - (message_bytes.len() % 32)) % 32;
    if padding_needed > 0 {
        result.extend_from_slice(&vec![0; padding_needed]);
    }
    
    Ok(result)
}

// Event emitted when a LayerZero message is sent
#[event]
pub struct LayerZeroMessageSent {
    pub destination_chain_id: u16,
    pub payload_length: u32,
    pub timestamp: i64,
} 