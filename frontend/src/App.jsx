import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  CssBaseline,
  Box,
  Paper,
  Tabs,
  Tab,
  ThemeProvider,
  createTheme,
  Button,
  Chip,
  Tooltip,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import InfoIcon from '@mui/icons-material/Info';
import { Connection } from '@solana/web3.js';
import { 
  WalletProvider, 
  ConnectionProvider 
} from '@solana/wallet-adapter-react';
import { 
  WalletModalProvider, 
  WalletMultiButton 
} from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';

// Import components
import CreateCapsule from './components/CreateCapsule';
import ViewCapsules from './components/ViewCapsules';

// Import configuration
import { CHAIN_IDS } from './env-config';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
    }
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif'
    ].join(','),
  },
});

// Styled components
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  marginBottom: theme.spacing(4),
}));

const StyledTabs = styled(Paper)(({ theme }) => ({
  marginBottom: theme.spacing(4),
}));

const StyledFooter = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(8),
  padding: theme.spacing(3),
  textAlign: 'center',
}));

const LoadingMessage = styled('div')(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
}));

const WalletConnectButton = styled(Button)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  textTransform: 'none',
  backgroundColor: theme.palette.success.main,
  '&:hover': {
    backgroundColor: theme.palette.success.dark,
  },
}));

const WalletDisconnectButton = styled(Button)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  textTransform: 'none',
  backgroundColor: theme.palette.error.main,
  '&:hover': {
    backgroundColor: theme.palette.error.dark,
  },
}));

// Network configuration
const endpoint = "https://api.devnet.solana.com";

// EVM Chain Info
const evmChains = {
  'sepolia': {
    name: 'Ethereum Sepolia',
    chainId: '0x' + CHAIN_IDS.sepolia.toString(16),
    rpcUrl: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    }
  },
  'arbitrum-sepolia': {
    name: 'Arbitrum Sepolia',
    chainId: '0x' + CHAIN_IDS['arbitrum-sepolia'].toString(16),
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia-explorer.arbitrum.io',
    nativeCurrency: {
      name: 'Arbitrum Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    }
  }
};

// Add error boundary class
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', backgroundColor: '#ffeeee', borderRadius: '5px', margin: '20px' }}>
          <h2>Something went wrong.</h2>
          <p>{this.state.error && this.state.error.toString()}</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary>Error Details</summary>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '10px 15px', 
              marginTop: '15px', 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metamaskConnected, setMetamaskConnected] = useState(false);
  const [evmAddress, setEvmAddress] = useState(null);
  const [networkType, setNetworkType] = useState(null);
  // Create a ref to the ViewCapsules component
  const viewCapsuleRef = React.createRef();

  // Setup Solana wallet adapter
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      // Add more wallet adapters as needed
    ],
    []
  );

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
  };

  // Handle MetaMask connection
  const connectMetaMask = async () => {
    if (!isMetaMaskInstalled()) {
      window.open('https://metamask.io/download.html', '_blank');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setEvmAddress(accounts[0]);
      setMetamaskConnected(true);

      // Get network type
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      handleChainChanged(chainId);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setMetamaskConnected(false);
          setEvmAddress(null);
        } else {
          setEvmAddress(accounts[0]);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', handleChainChanged);

    } catch (error) {
      console.error('Error connecting to MetaMask', error);
    }
  };

  // Handle chain changes
  const handleChainChanged = (chainId) => {
    // Check if it's one of our supported chains
    if (chainId === evmChains.sepolia.chainId) {
      setNetworkType('sepolia');
    } else if (chainId === evmChains['arbitrum-sepolia'].chainId) {
      setNetworkType('arbitrum-sepolia');
    } else {
      setNetworkType('unsupported');
    }
  };

  // Switch to a specific network
  const switchNetwork = async (networkKey) => {
    const chain = evmChains[networkKey];
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chain.chainId }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chain.chainId,
                chainName: chain.name,
                rpcUrls: [chain.rpcUrl],
                nativeCurrency: chain.nativeCurrency,
                blockExplorerUrls: [chain.blockExplorer],
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding chain', addError);
        }
      }
    }
  };

  // Disconnect MetaMask (just reset the state variables)
  const disconnectMetaMask = () => {
    setMetamaskConnected(false);
    setEvmAddress(null);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Function to refresh capsules when a new one is created
  const handleCapsuleCreated = () => {
    // Check if ref is valid and loadCapsules method exists
    if (viewCapsuleRef.current && viewCapsuleRef.current.loadCapsules) {
      console.log('Refreshing capsules from App component...');
      viewCapsuleRef.current.loadCapsules();
      
      // Optionally switch to the View Capsules tab
      setTabValue(1);
    }
  };

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    // Check if MetaMask is already connected
    if (isMetaMaskInstalled() && window.ethereum.selectedAddress) {
      setEvmAddress(window.ethereum.selectedAddress);
      setMetamaskConnected(true);
      
      window.ethereum.request({ method: 'eth_chainId' }).then(handleChainChanged);
    }

    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red', backgroundColor: '#ffeeee', borderRadius: '5px', margin: '20px' }}>
        <h2>Application Error</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <LoadingMessage>
        <Typography variant="h4">Loading Time Capsule DApp...</Typography>
        <Typography variant="body1">Please wait a moment</Typography>
      </LoadingMessage>
    );
  }

  // Helper to truncate the address
  const shortenAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <ThemeProvider theme={theme}>
      <ErrorBoundary>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <Router>
                <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
                  <CssBaseline />
                  
                  <StyledAppBar position="static">
                    <Toolbar>
                      <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Omnichain Time Capsule
                      </Typography>

                      {/* MetaMask Connection */}
                      {metamaskConnected ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                          <Chip 
                            icon={<AccountBalanceWalletIcon />}
                            label={`EVM: ${shortenAddress(evmAddress)}`}
                            color={networkType === 'unsupported' ? 'warning' : 'success'}
                            variant="outlined"
                            sx={{ mr: 1 }}
                          />
                          {networkType === 'unsupported' && (
                            <Tooltip title="Switch to a supported network (Sepolia or Arbitrum Sepolia)">
                              <IconButton size="small" color="warning">
                                <InfoIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Box sx={{ display: 'flex', flexDirection: 'column', ml: 1 }}>
                            <Button 
                              size="small" 
                              variant="contained"
                              color="info"
                              onClick={() => switchNetwork('sepolia')}
                              sx={{ mb: 0.5 }}
                            >
                              Sepolia
                            </Button>
                            <Button 
                              size="small" 
                              variant="contained"
                              color="info"
                              onClick={() => switchNetwork('arbitrum-sepolia')}
                            >
                              Arbitrum
                            </Button>
                          </Box>
                          <WalletDisconnectButton 
                            variant="contained"
                            onClick={disconnectMetaMask}
                            size="small"
                            sx={{ ml: 1 }}
                          >
                            Disconnect
                          </WalletDisconnectButton>
                        </Box>
                      ) : (
                        <WalletConnectButton 
                          variant="contained"
                          onClick={connectMetaMask}
                          startIcon={<AccountBalanceWalletIcon />}
                        >
                          Connect MetaMask
                        </WalletConnectButton>
                      )}

                      {/* Solana Wallet */}
                      <WalletMultiButton />
                    </Toolbar>
                  </StyledAppBar>
                  
                  <Container maxWidth="lg">
                    <StyledTabs>
                      <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        indicatorColor="primary"
                        textColor="primary"
                        centered
                      >
                        <Tab label="Create Time Capsule" />
                        <Tab label="View Your Capsules" />
                      </Tabs>
                    </StyledTabs>
                    
                    {tabValue === 0 && (
                      <CreateCapsule onCapsuleCreated={handleCapsuleCreated} />
                    )}
                    
                    {tabValue === 1 && (
                      <ViewCapsules ref={viewCapsuleRef} />
                    )}
                  </Container>
                  
                  <StyledFooter>
                    <Typography variant="body2" color="textSecondary">
                      Omnichain Time Capsule DApp powered by LayerZero V2
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      © {new Date().getFullYear()}
                    </Typography>
                  </StyledFooter>
                </Box>
              </Router>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App; 