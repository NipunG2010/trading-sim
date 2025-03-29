module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add rule to handle .mjs files
      webpackConfig.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      });

      // Specific configuration for @solana/web3.js
      webpackConfig.module.rules.push({
        test: /node_modules[\\/]@solana[\\/]web3\.js[\\/].*\.js$/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false
        }
      });

      // Ensure proper module resolution
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        extensions: [...(webpackConfig.resolve.extensions || []), '.mjs'],
        fallback: {
          ...(webpackConfig.resolve.fallback || {}),
          stream: require.resolve('stream-browserify'),
          crypto: require.resolve('crypto-browserify')
        }
      };

      return webpackConfig;
    }
  }
};