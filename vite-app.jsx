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
  createTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
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

// Import configuration
import './env-config';

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

// Network configuration
const endpoint = "https://api.devnet.solana.com";

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
    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

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
                      <div>Create Time Capsule Component (will be imported later)</div>
                    )}
                    
                    {tabValue === 1 && (
                      <div>View Time Capsules Component (will be imported later)</div>
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