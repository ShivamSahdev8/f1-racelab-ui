import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Amplify } from 'aws-amplify';
import { cognitoConfig } from './app/cognito.config';

Amplify.configure(cognitoConfig);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));