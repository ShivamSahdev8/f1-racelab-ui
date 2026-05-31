const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

const S3_URL = 'http://f1-racelab-ui.s3-website.us-east-2.amazonaws.com';

module.exports = withModuleFederationPlugin({
  remotes: {
    "auth-mfe":      `${S3_URL}/auth-mfe/remoteEntry.js`,
    "live-mfe":      `${S3_URL}/live-mfe/remoteEntry.js`,
    "stats-mfe":     `${S3_URL}/stats-mfe/remoteEntry.js`,
    "fantasy-mfe":   `${S3_URL}/fantasy-mfe/remoteEntry.js`,
    "predictor-mfe": `${S3_URL}/predictor-mfe/remoteEntry.js`,
    "news-mfe":      `${S3_URL}/news-mfe/remoteEntry.js`,
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
    'aws-amplify': { singleton: true, strictVersion: false },
    'aws-amplify/auth': { singleton: true, strictVersion: false },
  },
});
