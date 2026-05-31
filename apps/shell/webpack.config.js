const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({

   shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
    'aws-amplify': { singleton: true, strictVersion: false },
    'aws-amplify/auth': { singleton: true, strictVersion: false },
  },

});
