import { ComponentFixture, TestBed } from '@angular/core/testing';
import { F1CarVisualComponent } from './f1-car-visual';

// The component contract is tested without depending on WebGL support in jsdom.
jest.mock('./f1-car-scene', () => ({ F1CarScene: jest.fn() }));

type CarInputs = Partial<
  Pick<
    F1CarVisualComponent,
    'driver' | 'tyres' | 'weather' | 'downforce' | 'isLoading' | 'winChance'
  >
>;

describe('F1CarVisualComponent', () => {
  let fixture: ComponentFixture<F1CarVisualComponent>;
  let component: F1CarVisualComponent;
  let onContextLost: () => void;
  let scene: {
    update: jest.Mock;
    setView: jest.Mock;
    rotate: jest.Mock;
    zoom: jest.Mock;
    dispose: jest.Mock;
  };
  const sceneConstructor = jest.requireMock('./f1-car-scene')
    .F1CarScene as jest.Mock;

  beforeEach(async () => {
    sceneConstructor.mockReset();
    scene = {
      update: jest.fn(),
      setView: jest.fn(),
      rotate: jest.fn(),
      zoom: jest.fn(),
      dispose: jest.fn(),
    };
    sceneConstructor.mockImplementation(
      (_host: HTMLElement, contextLost: () => void) => {
        onContextLost = contextLost;
        return scene;
      },
    );

    await TestBed.configureTestingModule({
      imports: [F1CarVisualComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(F1CarVisualComponent);
    component = fixture.componentInstance;
  });

  async function settleViewer(): Promise<void> {
    // Lazy imports run outside Angular, so whenStable alone cannot await them.
    await import('./f1-car-scene');
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(inputs: CarInputs = {}): Promise<void> {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    await settleViewer();
  }

  function getButton(label: string): HTMLButtonElement {
    const root = fixture.nativeElement as HTMLElement;
    const button = Array.from(root.querySelectorAll('button')).find(
      (candidate) =>
        candidate.getAttribute('aria-label') === label ||
        candidate.textContent?.trim() === label,
    );
    if (!button) throw new Error(`Missing button: ${label}`);
    return button;
  }

  function getViewport(): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label^="3D Formula 1 car"]',
    )!;
  }

  it('initializes the 3D viewer with the simulator defaults', async () => {
    await render();

    expect(sceneConstructor).toHaveBeenCalledTimes(1);
    expect(sceneConstructor).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.any(Function),
    );
    expect(component.viewerState()).toBe('ready');
    expect(scene.update).toHaveBeenLastCalledWith({
      teamColor: '#888',
      tyreColor: '#e10600',
      tyres: 'SOFT',
      weather: 'DRY',
      downforce: 'HIGH',
      isLoading: false,
      tyreSpeed: 0.4,
    });
  });

  it.each<[string, string]>([
    ['Max Verstappen', '#4781D7'],
    ['Lando Norris', '#F47600'],
    ['Charles Leclerc', '#ED1131'],
    ['George Russell', '#00D7B6'],
    ['Fernando Alonso', '#229971'],
    ['Pierre Gasly', '#00A1E8'],
    ['Carlos Sainz', '#1868DB'],
    ['Nico Hulkenberg', '#F50537'],
    ['Liam Lawson', '#6C98FF'],
    ['Esteban Ocon', '#9C9FA2'],
    ['Sergio Perez', '#909090'],
    ['Unknown driver', '#888'],
  ])('preserves the livery for %s', async (driver, teamColor) => {
    await render({ driver });

    expect(component.teamColor).toBe(teamColor);
    expect(scene.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ teamColor }),
    );
  });

  it.each<[string, string, number]>([
    ['SOFT', '#e10600', 0.4],
    ['MEDIUM', '#ffd700', 0.7],
    ['HARD', '#ffffff', 1.2],
    ['INTERMEDIATE', '#00c800', 0.6],
    ['WET', '#0088ff', 0.8],
  ])(
    'updates the %s tyre compound and wheel speed',
    async (tyres, tyreColor, tyreSpeed) => {
      await render();
      await render({ tyres });

      expect(component.tyreColor).toBe(tyreColor);
      expect(scene.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ tyres, tyreColor, tyreSpeed }),
      );
      expect(fixture.nativeElement.textContent).toContain(tyres);
    },
  );

  it.each<[string, string]>([
    ['LOW', '5'],
    ['MEDIUM', '15'],
    ['HIGH', '25'],
  ])('preserves the %s downforce setting', async (downforce, rearWingAngle) => {
    await render({ downforce });

    expect(component.rearWingAngle).toBe(rearWingAngle);
    expect(scene.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ downforce }),
    );
    expect(fixture.nativeElement.textContent).toContain(downforce);
  });

  it.each(['DRY', 'DAMP', 'WET'])(
    'forwards %s weather to the scene',
    async (weather) => {
      await render({ weather });

      expect(scene.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ weather }),
      );
    },
  );

  it('updates an existing viewer as simulator selections change', async () => {
    await render({ driver: 'Max Verstappen' });
    await render({
      driver: 'Lewis Hamilton',
      tyres: 'INTERMEDIATE',
      weather: 'DAMP',
      downforce: 'MEDIUM',
      isLoading: true,
      winChance: 63,
    });

    expect(sceneConstructor).toHaveBeenCalledTimes(1);
    expect(scene.update).toHaveBeenLastCalledWith({
      teamColor: '#ED1131',
      tyreColor: '#00c800',
      tyres: 'INTERMEDIATE',
      weather: 'DAMP',
      downforce: 'MEDIUM',
      isLoading: true,
      tyreSpeed: 0.6,
    });
    expect(fixture.nativeElement.textContent).toContain('63%');

    await render({ isLoading: false });
    expect(scene.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ isLoading: false }),
    );
  });

  it('uses the latest inputs when the viewer finishes loading', async () => {
    fixture.componentRef.setInput('tyres', 'SOFT');
    fixture.detectChanges();
    fixture.componentRef.setInput('tyres', 'WET');
    fixture.componentRef.setInput('weather', 'WET');
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    await settleViewer();

    expect(scene.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tyres: 'WET',
        tyreColor: '#0088ff',
        weather: 'WET',
        isLoading: true,
      }),
    );
  });

  it('shows simulator values even when WebGL is unavailable', async () => {
    sceneConstructor.mockImplementationOnce(() => {
      throw new Error('WebGL unavailable');
    });

    await render({
      tyres: 'WET',
      weather: 'WET',
      downforce: 'HIGH',
      winChance: 42,
    });

    expect(component.viewerState()).toBe('unavailable');
    expect(fixture.nativeElement.textContent).toContain('WET');
    expect(fixture.nativeElement.textContent).toContain('HIGH');
    expect(fixture.nativeElement.textContent).toContain('42%');
    expect(getButton('Zoom in').disabled).toBe(true);
    expect(getButton('Top').disabled).toBe(true);
    expect(getViewport().tabIndex).toBe(-1);
  });

  it('preserves status and releases resources if the graphics context is lost', async () => {
    await render({ driver: 'Lewis Hamilton', tyres: 'MEDIUM', winChance: 72 });

    onContextLost();
    await render({ weather: 'DAMP', downforce: 'LOW' });

    expect(component.viewerState()).toBe('unavailable');
    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('MEDIUM');
    expect(fixture.nativeElement.textContent).toContain('LOW');
    expect(fixture.nativeElement.textContent).toContain('72%');
    fixture.destroy();
    expect(scene.dispose).toHaveBeenCalledTimes(1);
  });

  it('retries a failed viewer with the latest strategy settings', async () => {
    sceneConstructor.mockImplementationOnce(() => {
      throw new Error('WebGL unavailable');
    });
    await render();
    await render({ driver: 'Lando Norris', tyres: 'HARD', downforce: 'LOW' });

    const retry = getButton('Retry 3D');
    retry.click();
    retry.click();
    await settleViewer();

    expect(component.viewerState()).toBe('ready');
    expect(getButton('Zoom in').disabled).toBe(false);
    expect(getViewport().tabIndex).toBe(0);
    expect(sceneConstructor).toHaveBeenCalledTimes(2);
    expect(scene.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        teamColor: '#F47600',
        tyres: 'HARD',
        downforce: 'LOW',
      }),
    );
  });

  it('changes and resets the camera without changing the strategy', async () => {
    await render({ tyres: 'WET', downforce: 'LOW' });
    scene.update.mockClear();

    getButton('Side').click();
    fixture.detectChanges();
    expect(component.activeView).toBe('side');
    expect(getButton('Side').getAttribute('aria-pressed')).toBe('true');
    expect(scene.setView).toHaveBeenLastCalledWith('side');

    getButton('Top').click();
    fixture.detectChanges();
    expect(component.activeView).toBe('top');
    expect(getButton('Side').getAttribute('aria-pressed')).toBe('false');
    expect(getButton('Top').getAttribute('aria-pressed')).toBe('true');
    expect(scene.setView).toHaveBeenLastCalledWith('top');

    const reset = new KeyboardEvent('keydown', {
      key: 'Home',
      cancelable: true,
    });
    getViewport().dispatchEvent(reset);
    expect(reset.defaultPrevented).toBe(true);
    expect(component.activeView).toBe('perspective');
    expect(scene.setView).toHaveBeenLastCalledWith('perspective');
    expect(scene.update).not.toHaveBeenCalled();
    expect(component.tyres).toBe('WET');
    expect(component.downforce).toBe('LOW');
  });

  it.each<[string, number, number]>([
    ['ArrowLeft', -0.16, 0],
    ['ArrowRight', 0.16, 0],
    ['ArrowUp', 0, -0.12],
    ['ArrowDown', 0, 0.12],
  ])(
    'rotates the camera with %s and prevents page scrolling',
    async (key, horizontal, vertical) => {
      await render();
      const event = new KeyboardEvent('keydown', { key, cancelable: true });

      getViewport().dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(scene.rotate).toHaveBeenCalledWith(horizontal, vertical);
    },
  );

  it.each<[string, number]>([
    ['+', 0.85],
    ['=', 0.85],
    ['-', 1.18],
  ])('zooms with the %s key', async (key, factor) => {
    await render();
    const event = new KeyboardEvent('keydown', { key, cancelable: true });

    getViewport().dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(scene.zoom).toHaveBeenCalledWith(factor);
  });

  it('allows other keys to retain their normal browser behavior', async () => {
    await render();
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      cancelable: true,
    });

    getViewport().dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(scene.rotate).not.toHaveBeenCalled();
    expect(scene.zoom).not.toHaveBeenCalled();
  });

  it('releases the 3D scene when leaving the simulator', async () => {
    await render();

    fixture.destroy();

    expect(scene.dispose).toHaveBeenCalledTimes(1);
  });

  it('connects the visible zoom and reset controls to the camera', async () => {
    await render();

    getButton('Zoom in').click();
    expect(scene.zoom).toHaveBeenLastCalledWith(0.85);

    getButton('Zoom out').click();
    expect(scene.zoom).toHaveBeenLastCalledWith(1.18);

    getButton('Top').click();
    getButton('Reset camera').click();
    expect(scene.setView).toHaveBeenLastCalledWith('perspective');
  });

  it('does not create a scene if the component is destroyed while loading', async () => {
    fixture.detectChanges();
    fixture.destroy();
    await import('./f1-car-scene');

    expect(sceneConstructor).not.toHaveBeenCalled();
  });
});
