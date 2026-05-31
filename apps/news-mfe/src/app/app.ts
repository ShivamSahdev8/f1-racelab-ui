import { Component } from '@angular/core';
import { NewsFeed } from './news-feed/news-feed';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NewsFeed],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}