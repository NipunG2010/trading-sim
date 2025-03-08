module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Override webpack-dev-server options
      if (webpackConfig.devServer) {
        delete webpackConfig.devServer.onBeforeSetupMiddleware;
        delete webpackConfig.devServer.onAfterSetupMiddleware;
        
        webpackConfig.devServer.setupMiddlewares = (middlewares, devServer) => {
          return middlewares;
        };
      }
      
      return webpackConfig;
    }
  }
}; 