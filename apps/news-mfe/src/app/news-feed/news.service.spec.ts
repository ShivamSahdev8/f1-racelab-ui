import { DOCUMENT } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HostedNewsService } from '../hosted-news.service';

describe('HostedNewsService', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function setup(baseURI: string) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: DOCUMENT, useValue: { baseURI } }],
    });
    return TestBed.inject(HostedNewsService);
  }

  it.each([
    'https://example.com/shell/',
    'https://example.com/news-mfe/',
    'http://localhost:4200/',
  ])('loads the hosted feed relative to %s', baseURI => {
    const service = setup(baseURI);
    const result = jest.fn();
    service.getLatestNews().subscribe(result);
    const feed = { updatedAt: '2026-10-29T19:00:00Z', articles: [] };
    TestBed.inject(HttpTestingController).expectOne(`${baseURI}assets/news.json`).flush(feed);
    expect(result).toHaveBeenCalledWith(feed);
  });

  it('rejects a missing asset rewritten to a shell page', () => {
    const service = setup('https://example.com/shell/');
    const error = jest.fn();
    service.getLatestNews().subscribe({ error });
    TestBed.inject(HttpTestingController).expectOne('https://example.com/shell/assets/news.json').flush({});
    expect(error).toHaveBeenCalled();
  });
});
