import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Signup } from './signup/signup';
import { ForgotPassword } from './forgot-password/forgot-password';

export default [
  { path: 'login',    component: Login },
  { path: 'register', component: Signup },
  { path: 'forgot-password', component: ForgotPassword },
  { path: '',         redirectTo: 'login', pathMatch: 'full' }
] as Routes;