import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Amplify } from 'aws-amplify';
import { cognitoConfig } from '@f1-racelab/shared-ui';

console.log('Cognito config:', cognitoConfig);
Amplify.configure(cognitoConfig);
console.log('Amplify configured in shell');

bootstrapApplication(App, appConfig).catch((err) => console.error(err));