import { Component } from '@angular/core';
import { Login} from './login/login';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Login],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}