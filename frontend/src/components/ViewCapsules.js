import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Container,
  Grid,
  Paper,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Chip
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useWallet } from '@solana/wallet-adapter-react';
import { TimeCapsuleClient } from '../utils/TimeCapsuleClient';
import { PublicKey } from '@solana/web3.js';

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(4),
    marginTop: theme.spacing(4),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  cardContent: {
    flexGrow: 1,
  },
  chip: {
    position: 'absolute',
    top: theme.spacing(2),
    right: theme.spacing(2),
  },
  loadingSpinner: {
    marginLeft: theme.spacing(1),
  },
  message: {
    marginTop: theme.spacing(2),
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '200px',
    overflowY: 'auto',
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[100],
    borderRadius: theme.shape.borderRadius,
  },
  infoItem: {
    marginBottom: theme.spacing(1),
  },
  noCapsulesMessage: {
    textAlign: 'center',
    padding: theme.spacing(4),
  }
}));

const ViewCapsules = ({ connection }) => {
  const classes = useStyles();
  const wallet = useWallet();
  const [loading, setLoading] = useState(true);
  const [capsules, setCapsules] = useState([]);
  const [unlockingId, setUnlockingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (wallet.connected) {
      fetchCapsules();
    } else {
      setCapsules([]);
      setLoading(false);
    }
  }, [wallet.connected]);

  const fetchCapsules = async () => {
    if (!wallet.connected) return;
    
    setLoading(true);
    setError('');
    
    try {
      const client = new TimeCapsuleClient(connection, wallet);
      await client.init();
      
      const allCapsules = await client.getAllCapsules();
      setCapsules(allCapsules);
    } catch (err) {
      console.error('Error fetching time capsules:', err);
      setError('Failed to fetch time capsules: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (capsule) => {
    if (!wallet.connected) {
      setError('Please connect your wallet first');
      return;
    }
    
    // Check if it's time to unlock
    const now = Math.floor(Date.now() / 1000);
    if (now < capsule.account.releaseTimestamp.toNumber()) {
      setError(`This capsule can't be unlocked until ${new Date(capsule.account.releaseTimestamp.toNumber() * 1000).toLocaleString()}`);
      return;
    }
    
    setUnlockingId(capsule.publicKey.toString());
    setError('');
    setSuccess('');
    
    try {
      const client = new TimeCapsuleClient(connection, wallet);
      await client.init();
      
      // Determine if this is a token capsule
      const tokenMint = capsule.account.tokenMint 
        ? new PublicKey(capsule.account.tokenMint) 
        : null;
      
      await client.unlockCapsule(capsule.publicKey, tokenMint);
      
      setSuccess(`Capsule unlocked successfully! A message has been sent to the destination chain.`);
      
      // Refresh the list
      await fetchCapsules();
    } catch (err) {
      console.error('Error unlocking time capsule:', err);
      setError('Failed to unlock time capsule: ' + err.message);
    } finally {
      setUnlockingId(null);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getCapsuleTypeLabel = (type) => {
    const types = { '0': 'Text', '1': 'Token', '2': 'NFT' };
    return types[type.toString()] || 'Unknown';
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Paper className={classes.paper}>
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress />
            <Typography variant="h6" style={{ marginLeft: 16 }}>
              Loading time capsules...
            </Typography>
          </Box>
        </Paper>
      </Container>
    );
  }

  if (!wallet.connected) {
    return (
      <Container maxWidth="md">
        <Paper className={classes.paper}>
          <Typography variant="h6" className={classes.noCapsulesMessage}>
            Please connect your wallet to view your time capsules
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper className={classes.paper}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" component="h1">
            Your Time Capsules
          </Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={fetchCapsules}
          >
            Refresh
          </Button>
        </Box>
        
        {error && (
          <Box mb={3} p={2} bgcolor="error.light" borderRadius={1}>
            <Typography variant="body1" color="error">
              {error}
            </Typography>
          </Box>
        )}
        
        {success && (
          <Box mb={3} p={2} bgcolor="success.light" borderRadius={1}>
            <Typography variant="body1">
              {success}
            </Typography>
          </Box>
        )}
        
        {capsules.length === 0 ? (
          <Typography variant="h6" className={classes.noCapsulesMessage}>
            You don't have any time capsules yet
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {capsules.map((capsule) => {
              const isUnlocked = capsule.account.isUnlocked;
              const canUnlock = !isUnlocked && 
                Math.floor(Date.now() / 1000) >= capsule.account.releaseTimestamp.toNumber();
              
              return (
                <Grid item xs={12} sm={6} key={capsule.publicKey.toString()}>
                  <Card className={classes.card}>
                    <Chip 
                      label={isUnlocked ? 'Unlocked' : 'Locked'}
                      color={isUnlocked ? 'secondary' : 'primary'}
                      className={classes.chip}
                    />
                    <CardContent className={classes.cardContent}>
                      <Typography variant="h5" component="h2" gutterBottom>
                        {getCapsuleTypeLabel(capsule.account.capsuleType)} Capsule
                      </Typography>
                      
                      <Box className={classes.infoItem}>
                        <Typography variant="body2" color="textSecondary" component="p">
                          Created: {formatDate(capsule.account.createdAt.toNumber())}
                        </Typography>
                      </Box>
                      
                      <Box className={classes.infoItem}>
                        <Typography variant="body2" color="textSecondary" component="p">
                          Unlocks: {formatDate(capsule.account.releaseTimestamp.toNumber())}
                        </Typography>
                      </Box>
                      
                      {isUnlocked && capsule.account.unlockedAt && (
                        <Box className={classes.infoItem}>
                          <Typography variant="body2" color="textSecondary" component="p">
                            Unlocked: {formatDate(capsule.account.unlockedAt.toNumber())}
                          </Typography>
                        </Box>
                      )}
                      
                      <Box className={classes.infoItem}>
                        <Typography variant="body2" color="textSecondary" component="p">
                          Destination Chain ID: {capsule.account.destinationChainId}
                        </Typography>
                      </Box>
                      
                      {capsule.account.capsuleType.toString() === '0' && (
                        <Box mt={2}>
                          <Typography variant="subtitle2">Message:</Typography>
                          <Box className={classes.message}>
                            {capsule.account.content}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        color="primary"
                        disabled={isUnlocked || !canUnlock || unlockingId === capsule.publicKey.toString()}
                        onClick={() => handleUnlock(capsule)}
                        fullWidth
                      >
                        {unlockingId === capsule.publicKey.toString() ? (
                          <>
                            Unlocking...
                            <CircularProgress size={24} className={classes.loadingSpinner} />
                          </>
                        ) : (
                          isUnlocked ? 'Already Unlocked' : (canUnlock ? 'Unlock Now' : 'Not Yet Unlockable')
                        )}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>
    </Container>
  );
};

export default ViewCapsules; 