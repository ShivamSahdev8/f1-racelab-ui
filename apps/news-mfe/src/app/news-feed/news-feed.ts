import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Observable, map } from 'rxjs';
import { NewsService, NewsArticle } from '@f1-racelab/f1-data-client';
import { AuthStateService } from '@f1-racelab/shared-ui';

/** Team accent colors — same palette as the signup team picker */
const TEAM_COLORS: Record<string, string> = {
  'ferrari':       '#ED1131',
  'mclaren':       '#F47600',
  'red bull':      '#4781D7',
  'mercedes':      '#00D7B6',
  'aston martin':  '#229971',
  'alpine':        '#00A1E8',
  'williams':      '#1868DB',
  'racing bulls':  '#6C98FF',
  'haas':          '#9C9FA2',
  'audi':          '#F50537',
};

@Component({
  selector: 'app-news-feed',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './news-feed.html',
  styleUrl: './news-feed.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewsFeed {

  news$: Observable<NewsArticle[]>;
  favouriteTeam$: Observable<string | null>;

  constructor(
    private newsService: NewsService,
    private authState: AuthStateService
  ) {
    this.news$ = this.newsService.getLatestNews();
    this.favouriteTeam$ = this.authState.user$.pipe(
      map(user => user?.favouriteTeam ?? null)
    );
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

  /** Published within the last 6 hours → "NEW" pulse badge */
  isFresh(dateString: string): boolean {
    const diff = Date.now() - new Date(dateString).getTime();
    return diff < 6 * 60 * 60 * 1000;
  }

  /** Article mentions the user's favourite team in title or description */
  mentionsFavTeam(article: NewsArticle, favTeam: string | null): boolean {
    if (!favTeam) return false;
    const haystack = `${article.title} ${article.description}`.toLowerCase();
    return haystack.includes(favTeam.toLowerCase());
  }

  getTeamColor(teamName: string | null): string {
    if (!teamName) return '#E10600';
    return TEAM_COLORS[teamName.toLowerCase()] ?? '#E10600';
  }

  trackByLink(index: number, article: NewsArticle): string {
    return article.link ?? String(index);
  }
}
