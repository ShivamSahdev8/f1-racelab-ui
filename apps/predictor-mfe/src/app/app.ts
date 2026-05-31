import { Component } from '@angular/core';
import { PredictorPreview } from './predictor-preview/predictor-preview';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PredictorPreview],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}