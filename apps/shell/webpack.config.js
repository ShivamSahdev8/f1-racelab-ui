const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({

  remotes: {
    "auth-mfe":      "http://localhost:4201/remoteEntry.js",
    "live-mfe":      "http://localhost:4202/remoteEntry.js",
    "stats-mfe":     "http://localhost:4203/remoteEntry.js",
    "fantasy-mfe":   "http://localhost:4204/remoteEntry.js",
    "predictor-mfe": "http://localhost:4205/remoteEntry.js",
    "news-mfe":      "http://localhost:4206/remoteEntry.js",
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

});
