import { Component } from '@angular/core';
import { LiveTimingComponent } from '../app/live-timing/live-timing';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LiveTimingComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}