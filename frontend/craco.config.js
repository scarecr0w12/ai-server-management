module.exports = {
  devServer: {
    // Override the default historyApiFallback configuration
    // to fix the issue where .js files are served as index.html
    historyApiFallback: {
      // Set disableDotRule to false so that requests for files with dots
      // (like main.65cf2fd6.js) are served as actual files, not index.html
      disableDotRule: false,
      index: '/index.html',
    },
    // Disable hot reloading to fix repeated mounting/unmounting issue
    hot: false,
    liveReload: false,
  },
};
