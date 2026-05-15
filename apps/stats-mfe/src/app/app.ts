import { Component } from '@angular/core';
import { Standings } from './standings/standings';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Standings],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}