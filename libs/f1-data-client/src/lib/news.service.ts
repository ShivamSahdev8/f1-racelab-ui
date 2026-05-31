import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';

export interface NewsArticle {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  thumbnail: string;
  source: string;
}

const RSS_TO_JSON = 'https://api.rss2json.com/v1/api.json';
const F1_RSS_FEED = 'https://www.formula1.com/en/latest/all.xml';

@Injectable({ providedIn: 'root' })
export class NewsService {

  constructor(private http: HttpClient) {}

  getLatestNews(): Observable<NewsArticle[]> {
    return this.http
      .get<any>(RSS_TO_JSON, {
        params: {
          rss_url: F1_RSS_FEED
        }
      })
      .pipe(
        map(response => response.items.map(this.mapArticle)),
        catchError(this.handleError)
      );
  }

  private mapArticle = (raw: any): NewsArticle => ({
    title:       raw.title,
    description: raw.description?.replace(/<[^>]*>/g, '') ?? '',
    link:        raw.link,
    pubDate:     raw.pubDate,
    thumbnail:   raw.thumbnail || raw.enclosure?.link || '',
    source:      'Formula 1'
  });

  private handleError(error: any): Observable<never> {
    console.error('News API Error:', error);
    return throwError(() => new Error(error.message));
  }
}