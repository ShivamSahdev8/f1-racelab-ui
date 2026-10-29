import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewsFeed } from './news-feed';
import { HostedNewsService } from '../hosted-news.service';
import { AuthStateService } from '@f1-racelab/shared-ui';
import { of, throwError } from 'rxjs';

describe('NewsFeed', () => {
  let component: NewsFeed;
  let fixture: ComponentFixture<NewsFeed>;
  const getLatestNews = jest.fn();

  beforeEach(async () => {
    getLatestNews.mockReturnValue(of({ updatedAt: '2026-10-29T19:00:00Z', articles: [] }));
    await TestBed.configureTestingModule({
      imports: [NewsFeed],
      providers: [
        { provide: HostedNewsService, useValue: { getLatestNews } },
        { provide: AuthStateService, useValue: { user$: of(null) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsFeed);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('replaces the loader with an error and retries successfully', async () => {
    getLatestNews.mockReturnValueOnce(throwError(() => new Error('403')));
    component.retry();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('temporarily unavailable');
    expect(fixture.nativeElement.querySelector('.loading-state')).toBeNull();
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No news is available yet');
  });

  it('does not label missing or future publication dates as new', () => {
    expect(component.getTimeAgo('')).toBe('');
    expect(component.isFresh('')).toBe(false);
    expect(component.isFresh(new Date(Date.now() + 60000).toISOString())).toBe(false);
  });
});
