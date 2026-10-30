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

  it('filters drivers by team and renders the selected car colour and number', () => {
    const page = fixture.nativeElement as HTMLElement;
    const team = page.querySelector<HTMLSelectElement>('#arcade-team')!;
    team.value = 'mclaren';
    team.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const driver = page.querySelector<HTMLSelectElement>('#arcade-driver')!;
    expect(Array.from(driver.options).map(option => option.value)).toEqual(['norris', 'piastri']);
    expect(driver.value).toBe('norris');
    driver.value = 'piastri';
    driver.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(page.querySelector('.driver-strip')?.textContent).toContain('Oscar Piastri');
    expect(page.querySelector('.player-car text')?.textContent).toBe('81');
    expect(page.querySelector('.player-car path[fill="#F47600"]')).not.toBeNull();
    component.selectTeam('ferrari');
    fixture.detectChanges();
    expect(driver.value).toBe('leclerc');
    expect(page.querySelector('.player-car text')?.textContent).toBe('16');
  });

  it('rejects drivers from another team and retains a valid seat through restart', () => {
    component.selectDriver('hamilton');
    component.selectDriver('norris');
    component.selectTeam('unknown-team');
    expect(component.selectedDriver().id).toBe('hamilton');
    component.start();
    component.start();
    expect(component.selectedTeam().id).toBe('ferrari');
    expect(component.selectedDriver().number).toBe(44);
  });

  it('locks the seat during a run and lets the player return to the garage to change it', () => {
    component.start();
    component.selectTeam('mclaren');
    component.selectDriver('hamilton');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    expect(component.selectedDriver().id).toBe('leclerc');
    component.pause();
    component.selectTeam('mercedes');
    expect(component.selectedTeam().id).toBe('ferrari');
    component.returnToGarage();
    component.selectTeam('mercedes');
    component.selectDriver('antonelli');
    fixture.detectChanges();
    expect(component.status()).toBe('ready');
    expect(component.distance()).toBe(0);
    expect(component.selectedDriver().number).toBe(12);
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(false);
  });
});
