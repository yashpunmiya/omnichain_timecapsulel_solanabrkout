import React, { useState, useEffect } from 'react';
import { 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Typography, 
  Container,
  Grid,
  Paper,
  Box,
  CircularProgress
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useWallet } from '@solana/wallet-adapter-react';
import { TimeCapsuleClient } from '../utils/TimeCapsuleClient';

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(4),
    marginTop: theme.spacing(4),
  },
  formControl: {
    marginBottom: theme.spacing(3),
    minWidth: '100%',
  },
  submitButton: {
    marginTop: theme.spacing(2),
  },
  loadingSpinner: {
    marginLeft: theme.spacing(1),
  }
}));

// Define the EVM chains available for destination
const EVMChains = [
  { id: 11155111, name: 'Ethereum Sepolia', layerZeroId: 10161 },
  { id: 421614, name: 'Arbitrum Sepolia', layerZeroId: 10231 },
  { id: 80001, name: 'Polygon Mumbai', layerZeroId: 10109 }
];

const CreateCapsule = ({ connection }) => {
  const classes = useStyles();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Form values
  const [capsuleType, setCapsuleType] = useState('text');
  const [message, setMessage] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [destinationChain, setDestinationChain] = useState(EVMChains[0].layerZeroId);
  const [destinationAddress, setDestinationAddress] = useState('');

  // Reset feedback states when form changes
  useEffect(() => {
    setSuccess(false);
    setError('');
  }, [capsuleType, message, releaseDate, destinationChain, destinationAddress]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!wallet.connected) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (!message) {
      setError('Please enter a message for your time capsule');
      return;
    }
    
    if (!releaseDate) {
      setError('Please select a release date');
      return;
    }
    
    // Calculate release timestamp (seconds since epoch)
    const releaseTimestamp = Math.floor(new Date(releaseDate).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    
    if (releaseTimestamp <= now) {
      setError('Release date must be in the future');
      return;
    }
    
    // Parse destination address to bytes32
    let destinationBytes;
    try {
      // Remove 0x prefix if present and pad to 32 bytes
      const addressHex = destinationAddress.startsWith('0x') 
        ? destinationAddress.slice(2) 
        : destinationAddress;
      
      if (addressHex.length !== 40 && addressHex.length !== 64) {
        throw new Error('Invalid address length');
      }
      
      // Pad to 32 bytes if needed (for Ethereum addresses)
      const paddedHex = addressHex.padStart(64, '0');
      
      // Convert to byte array
      destinationBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        destinationBytes[i] = parseInt(paddedHex.substr(i * 2, 2), 16);
      }
    } catch (err) {
      setError('Invalid destination address format');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      // Initialize the client
      const client = new TimeCapsuleClient(connection, wallet);
      await client.init();
      
      // Create the time capsule
      if (capsuleType === 'text') {
        await client.createTextCapsule(
          message,
          releaseTimestamp,
          destinationChain,
          Array.from(destinationBytes)
        );
      } else {
        // Token implementation would go here
        setError('Token capsules are not yet implemented in this UI');
        setLoading(false);
        return;
      }
      
      setSuccess(true);
      // Reset form
      setMessage('');
      setReleaseDate('');
    } catch (err) {
      console.error('Error creating time capsule:', err);
      setError('Failed to create time capsule: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper className={classes.paper} elevation={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create Time Capsule
        </Typography>
        
        {success && (
          <Box mb={3} p={2} bgcolor="success.light" borderRadius={1}>
            <Typography variant="body1">
              Time capsule created successfully!
            </Typography>
          </Box>
        )}
        
        {error && (
          <Box mb={3} p={2} bgcolor="error.light" borderRadius={1}>
            <Typography variant="body1" color="error">
              {error}
            </Typography>
          </Box>
        )}
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl className={classes.formControl}>
                <InputLabel>Capsule Type</InputLabel>
                <Select
                  value={capsuleType}
                  onChange={(e) => setCapsuleType(e.target.value)}
                >
                  <MenuItem value="text">Text Message</MenuItem>
                  <MenuItem value="token" disabled>Token (Coming Soon)</MenuItem>
                  <MenuItem value="nft" disabled>NFT (Coming Soon)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Your Message"
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Release Date"
                type="datetime-local"
                variant="outlined"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl className={classes.formControl}>
                <InputLabel>Destination Chain</InputLabel>
                <Select
                  value={destinationChain}
                  onChange={(e) => setDestinationChain(e.target.value)}
                >
                  {EVMChains.map((chain) => (
                    <MenuItem key={chain.id} value={chain.layerZeroId}>
                      {chain.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Destination Contract Address"
                variant="outlined"
                fullWidth
                placeholder="0x..."
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                className={classes.submitButton}
                disabled={loading || !wallet.connected}
              >
                {loading ? (
                  <>
                    Creating Time Capsule...
                    <CircularProgress size={24} className={classes.loadingSpinner} />
                  </>
                ) : (
                  'Create Time Capsule'
                )}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default CreateCapsule; 