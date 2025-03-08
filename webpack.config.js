npmmodule.exports = {
  // Your other webpack configurations...
  
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      // Your custom middleware setup if needed
      return middlewares;
    }
  }
}; 