import { Component } from '@angular/core';
import { FantasyPreview} from './fantasy-preview/fantasy-preview';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FantasyPreview],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}