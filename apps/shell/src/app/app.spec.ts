import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';

jest.mock('aws-amplify', () => ({ Amplify: { configure: jest.fn() } }));
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn().mockRejectedValue(new Error('No session')),
}));

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders navigation above the routed page content', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('nav')?.getAttribute('aria-label')).toBe('Main navigation');
    expect(compiled.querySelector('.route-container router-outlet')).not.toBeNull();
  });
});
