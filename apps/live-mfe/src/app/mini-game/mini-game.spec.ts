import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MiniGameComponent } from './mini-game';

describe('MiniGameComponent', () => {
  let fixture: ComponentFixture<MiniGameComponent>;
  let component: MiniGameComponent;
  let requestFrame: jest.SpyInstance;
  let cancelFrame: jest.SpyInstance;

  beforeEach(async () => {
    requestFrame = jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
    cancelFrame = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    await TestBed.configureTestingModule({ imports: [MiniGameComponent] }).compileComponents();
    fixture = TestBed.createComponent(MiniGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => { fixture.destroy(); jest.restoreAllMocks(); });

  it('stays still until explicitly started and pauses when the window loses focus', () => {
    expect(component.status()).toBe('ready');
    expect(component.distance()).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Start engine');
    component.start();
    expect(component.status()).toBe('racing');
    expect(requestFrame).toHaveBeenCalled();
    component.windowBlur();
    expect(component.status()).toBe('paused');
    expect(cancelFrame).toHaveBeenCalledWith(42);
    component.resume();
    expect(component.status()).toBe('racing');
  });

  it('handles arrow keys only during play and cancels its animation when destroyed', () => {
    const idleArrow = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true });
    component.keyDown(idleArrow);
    expect(idleArrow.defaultPrevented).toBe(false);
    component.start();
    const racingArrow = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true });
    component.keyDown(racingArrow);
    expect(racingArrow.defaultPrevented).toBe(true);
    component.ngOnDestroy();
    expect(cancelFrame).toHaveBeenCalledWith(42);
  });
});
