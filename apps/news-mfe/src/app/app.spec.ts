import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { HostedNewsService } from './hosted-news.service';
import { AuthStateService } from '@f1-racelab/shared-ui';
import { of } from 'rxjs';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: HostedNewsService, useValue: { getLatestNews: () => of({ updatedAt: '2026-10-29T19:00:00Z', articles: [] }) } },
        { provide: AuthStateService, useValue: { user$: of(null) } },
      ],
    }).compileComponents();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'F1 NEWS',
    );
  });
});
