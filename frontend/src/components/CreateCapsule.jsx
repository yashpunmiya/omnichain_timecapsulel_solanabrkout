import React, { useState } from 'react';
import { Paper, Typography, TextField, Button, Box, MenuItem, Select, FormControl, InputLabel, Alert, Snackbar, Tabs, Tab } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createTimeCapsule, createTokenCapsule } from '../utils/blockchain';

const CreateCapsule = ({ onCapsuleCreated }) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [message, setMessage] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [destinationChain, setDestinationChain] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [capsuleType, setCapsuleType] = useState(0); // 0 for text, 1 for token
  const [tokenMint, setTokenMint] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');

  const handleTabChange = (event, newValue) => {
    setCapsuleType(newValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wallet.publicKey) {
      setNotification({
        open: true,
        message: 'Please connect your wallet first',
        severity: 'error'
      });
      return;
    }

    // Validate common fields
    if (!unlockDate || !destinationChain) {
      setNotification({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }

    // Validate type-specific fields
    if (capsuleType === 0 && !message) {
      setNotification({
        open: true,
        message: 'Please enter a message for your time capsule',
        severity: 'error'
      });
      return;
    }

    if (capsuleType === 1 && (!tokenMint || !tokenAmount || isNaN(parseFloat(tokenAmount)) || parseFloat(tokenAmount) <= 0)) {
      setNotification({
        open: true,
        message: 'Please enter a valid token mint address and amount',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      let signature;
      
      if (capsuleType === 0) {
        // Create text capsule
        signature = await createTimeCapsule(wallet, message, unlockDate, destinationChain);
      } else {
        // Create token capsule
        signature = await createTokenCapsule(
          wallet, 
          tokenMint, 
          parseFloat(tokenAmount), 
          unlockDate, 
          destinationChain
        );
      }
      
      setNotification({
        open: true,
        message: 'Time capsule created successfully!',
        severity: 'success'
      });
      
      // Reset form
      setMessage('');
      setUnlockDate('');
      setDestinationChain('');
      setTokenMint('');
      setTokenAmount('');
      
      // Call the refresh function if provided
      if (onCapsuleCreated) {
        console.log('Refreshing capsules after creation...');
        // Add a slight delay to ensure blockchain state is updated
        setTimeout(() => {
          onCapsuleCreated();
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating capsule:', error);
      setNotification({
        open: true,
        message: `Error creating capsule: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>Create New Time Capsule</Typography>
      
      <Tabs value={capsuleType} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Text Capsule" />
        <Tab label="Token Capsule" />
      </Tabs>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        {capsuleType === 0 ? (
          <TextField
            fullWidth
            label="Message"
            multiline
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            sx={{ mb: 3 }}
            disabled={loading}
          />
        ) : (
          <>
            <TextField
              fullWidth
              label="Token Mint Address"
              value={tokenMint}
              onChange={(e) => setTokenMint(e.target.value)}
              sx={{ mb: 3 }}
              disabled={loading}
              placeholder="Enter Solana SPL token mint address"
              helperText="The mint address of the SPL token you want to lock"
            />
            <TextField
              fullWidth
              label="Token Amount"
              type="number"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              sx={{ mb: 3 }}
              disabled={loading}
              inputProps={{ min: 0, step: "any" }}
              placeholder="Amount of tokens to lock"
            />
          </>
        )}
        
        <TextField
          fullWidth
          type="datetime-local"
          label="Unlock Date"
          value={unlockDate}
          onChange={(e) => setUnlockDate(e.target.value)}
          sx={{ mb: 3 }}
          disabled={loading}
          InputLabelProps={{ shrink: true }}
        />
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Destination Chain</InputLabel>
          <Select
            value={destinationChain}
            onChange={(e) => setDestinationChain(e.target.value)}
            label="Destination Chain"
            disabled={loading}
          >
            <MenuItem value="sepolia">Ethereum Sepolia</MenuItem>
            <MenuItem value="arbitrum-sepolia">Arbitrum Sepolia</MenuItem>
          </Select>
        </FormControl>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          type="submit"
          disabled={!wallet.publicKey || loading}
        >
          {loading ? 'Creating...' : (wallet.publicKey ? 'Create Time Capsule' : 'Connect Wallet to Create')}
        </Button>
      </Box>
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default CreateCapsule;
