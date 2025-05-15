const webpack = require('webpack');
const {
  override,
  addWebpackAlias,
  addWebpackPlugin,
  setWebpackOptimizationSplitChunks,
} = require('customize-cra');
const path = require('path');

module.exports = override(
  // Add webpack aliases
  addWebpackAlias({
    'process/browser': require.resolve('process/browser'),
  }),
  
  // Add webpack plugins
  addWebpackPlugin(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  ),
  
  // Optimize chunk splitting for better performance
  setWebpackOptimizationSplitChunks({
    chunks: 'all',
    name: false,
  }),
  
  // Add custom webpack configuration
  (config) => {
    // Add Node.js polyfills
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      assert: require.resolve('assert'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify'),
      url: require.resolve('url'),
      zlib: require.resolve('browserify-zlib'),
      path: require.resolve('path-browserify'),
      fs: false,
      process: require.resolve('process/browser'),
      buffer: require.resolve('buffer'),
    };
    
    // Ignore source-map warnings
    config.ignoreWarnings = [/Failed to parse source map/];
    
    return config;
  }
); 