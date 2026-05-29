const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({
  name: 'auth-mfe',
  exposes: {
    './Module': './apps/auth-mfe/src/app/app.routes.ts',
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
    'aws-amplify': { singleton: true, strictVersion: false },
    'aws-amplify/auth': { singleton: true, strictVersion: false },
  },
});