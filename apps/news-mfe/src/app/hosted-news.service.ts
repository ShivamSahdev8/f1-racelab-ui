import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, map, timeout } from 'rxjs';

import type { NewsArticle } from '@f1-racelab/f1-data-client';

export interface NewsFeedSnapshot {
  updatedAt: string;
  articles: NewsArticle[];
}

@Injectable({ providedIn: 'root' })
export class HostedNewsService {

  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);

  getLatestNews(): Observable<NewsFeedSnapshot> {
    // Shell and standalone news builds both publish the asset beside their index.
    const url = new URL('assets/news.json', this.document.baseURI).href;
    return this.http.get<NewsFeedSnapshot>(url).pipe(
      timeout(15000),
      map(feed => {
        if (!Array.isArray(feed?.articles) || !Number.isFinite(Date.parse(feed.updatedAt))) {
          throw new Error('The news feed is unavailable.');
        }
        return feed;
      })
    );
  }
}
