import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { LiveSessionService } from './live-session.service';

describe('App', () => {
  it('renders the race centre', async () => {
    jest.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: LiveSessionService, useValue: { getState: () => of({ status: 'idle', session: null, entries: [] }) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('RACE CENTRE');
    fixture.destroy();
    jest.useRealTimers();
  });
});
