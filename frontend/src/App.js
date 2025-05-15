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
  Tab
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
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
import { SOLANA_RPC_URL, SOLANA_PROGRAM_ID, TIME_CAPSULE_RECEIVER_ADDRESS } from './env-config';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    minHeight: '100vh',
    backgroundColor: theme.palette.background.default,
  },
  appBar: {
    marginBottom: theme.spacing(4),
  },
  title: {
    flexGrow: 1,
  },
  walletButton: {
    marginLeft: theme.spacing(2),
  },
  tabsContainer: {
    marginBottom: theme.spacing(4),
  },
  footer: {
    marginTop: theme.spacing(8),
    padding: theme.spacing(3),
    textAlign: 'center',
  },
}));

// Network configuration
const endpoint = SOLANA_RPC_URL;

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
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const classes = useStyles();
  const [tabValue, setTabValue] = useState(0);

  // Setup Solana wallet adapter
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      // Add more wallet adapters as needed
    ],
    []
  );

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    // Add a check to ensure environment variables are loaded
    console.log("Environment check:", {
      SOLANA_RPC_URL: SOLANA_RPC_URL,
      SOLANA_PROGRAM_ID: SOLANA_PROGRAM_ID,
      EVM_CONTRACT: TIME_CAPSULE_RECEIVER_ADDRESS
    });
  }, []);

  return (
    <ErrorBoundary>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Router>
              <div className={classes.root}>
                <CssBaseline />
                
                <AppBar position="static" className={classes.appBar}>
                  <Toolbar>
                    <Typography variant="h6" className={classes.title}>
                      Omnichain Time Capsule
                    </Typography>
                    <WalletMultiButton className={classes.walletButton} />
                  </Toolbar>
                </AppBar>
                
                <Container maxWidth="lg">
                  <Paper className={classes.tabsContainer}>
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
                  </Paper>
                  
                  {tabValue === 0 && (
                    <CreateCapsule connection={new Connection(endpoint)} />
                  )}
                  
                  {tabValue === 1 && (
                    <ViewCapsules connection={new Connection(endpoint)} />
                  )}
                </Container>
                
                <Box component="footer" className={classes.footer}>
                  <Typography variant="body2" color="textSecondary">
                    Omnichain Time Capsule DApp powered by LayerZero V2
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    © {new Date().getFullYear()}
                  </Typography>
                </Box>
              </div>
            </Router>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ErrorBoundary>
  );
}

export default App; 