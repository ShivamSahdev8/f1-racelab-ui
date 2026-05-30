import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { Observable } from 'rxjs';
import { NewsService, NewsArticle } from '@f1-racelab/f1-data-client';

@Component({
  selector: 'app-news-feed',
  standalone: true,
  imports: [CommonModule, AsyncPipe, DatePipe],
  templateUrl: './news-feed.html',
  styleUrl: './news-feed.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewsFeed {

  news$: Observable<NewsArticle[]>;

  constructor(private newsService: NewsService) {
    this.news$ = this.newsService.getLatestNews();
  }

  openArticle(url: string): void {
    window.open(url, '_blank');
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  }
}