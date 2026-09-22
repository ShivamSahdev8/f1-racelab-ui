import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { CarView, F1CarScene } from './f1-car-scene';

@Component({
  selector: 'app-f1-car-visual',
  standalone: true,
  templateUrl: './f1-car-visual.html',
  styleUrl: './f1-car-visual.css',
})
export class F1CarVisualComponent
  implements OnChanges, AfterViewInit, OnDestroy
{
  @Input() driver = '';
  @Input() tyres = 'SOFT';
  @Input() weather = 'DRY';
  @Input() downforce = 'HIGH';
  @Input() isLoading = false;
  @Input() winChance = 0;

  teamColor = '#888';
  tyreColor = '#e10600';
  tyreSpeed = '0.4s';
  rearWingAngle = '25';

  @ViewChild('viewport', { static: true })
  private viewport!: ElementRef<HTMLDivElement>;
  readonly viewerState = signal<'loading' | 'ready' | 'unavailable'>('loading');
  readonly views: { id: CarView; label: string }[] = [
    { id: 'perspective', label: '3D view' },
    { id: 'side', label: 'Side' },
    { id: 'top', label: 'Top' },
  ];
  activeView: CarView = 'perspective';
  readonly rainDrops = Array.from({ length: 22 }, (_, i) => i);
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private scene?: F1CarScene;
  private destroyed = false;

  private teamColors: Record<string, string> = {
    'Max Verstappen': '#4781D7',
    'Isack Hadjar': '#4781D7',
    'Lando Norris': '#F47600',
    'Oscar Piastri': '#F47600',
    'Charles Leclerc': '#ED1131',
    'Lewis Hamilton': '#ED1131',
    'George Russell': '#00D7B6',
    'Kimi Antonelli': '#00D7B6',
    'Fernando Alonso': '#229971',
    'Lance Stroll': '#229971',
    'Pierre Gasly': '#00A1E8',
    'Franco Colapinto': '#00A1E8',
    'Alexander Albon': '#1868DB',
    'Carlos Sainz': '#1868DB',
    'Nico Hulkenberg': '#F50537',
    'Gabriel Bortoleto': '#F50537',
    'Liam Lawson': '#6C98FF',
    'Arvid Lindblad': '#6C98FF',
    'Esteban Ocon': '#9C9FA2',
    'Oliver Bearman': '#9C9FA2',
    'Valtteri Bottas': '#909090',
    'Sergio Perez': '#909090',
  };

  private tyreColors: Record<string, string> = {
    SOFT: '#e10600',
    MEDIUM: '#ffd700',
    HARD: '#ffffff',
    INTERMEDIATE: '#00c800',
    WET: '#0088ff',
  };

  private tyreSpeeds: Record<string, string> = {
    SOFT: '0.4s',
    MEDIUM: '0.7s',
    HARD: '1.2s',
    INTERMEDIATE: '0.6s',
    WET: '0.8s',
  };

  ngOnChanges(): void {
    this.teamColor = this.teamColors[this.driver] || '#888';
    this.tyreColor = this.tyreColors[this.tyres] || '#e10600';
    this.tyreSpeed = this.tyreSpeeds[this.tyres] || '0.7s';
    this.rearWingAngle =
      this.downforce === 'HIGH'
        ? '25'
        : this.downforce === 'MEDIUM'
          ? '15'
          : '5';
    this.updateScene();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) void this.initViewer();
  }

  private async initViewer(): Promise<void> {
    try {
      // The WebGL engine is fetched only when the simulator is opened.
      const { F1CarScene } = await import('./f1-car-scene');
      if (this.destroyed) return;
      this.zone.runOutsideAngular(() => {
        this.scene = new F1CarScene(this.viewport.nativeElement, () => {
          this.zone.run(() => this.showFallback());
        });
        this.updateScene();
      });
      this.viewerState.set('ready');
    } catch {
      if (!this.destroyed) this.showFallback();
    }
  }

  private updateScene(): void {
    this.zone.runOutsideAngular(() =>
      this.scene?.update({
        teamColor: this.teamColor,
        tyreColor: this.tyreColor,
        tyres: this.tyres,
        weather: this.weather,
        downforce: this.downforce,
        isLoading: this.isLoading,
        tyreSpeed: parseFloat(this.tyreSpeed),
      }),
    );
  }

  private showFallback(): void {
    this.scene?.dispose();
    this.scene = undefined;
    this.viewerState.set('unavailable');
  }

  retryViewer(): void {
    if (this.viewerState() !== 'unavailable') return;
    this.viewerState.set('loading');
    this.activeView = 'perspective';
    void this.initViewer();
  }

  selectView(view: CarView): void {
    this.activeView = view;
    this.zone.runOutsideAngular(() => this.scene?.setView(view));
  }

  zoom(factor: number): void {
    this.zone.runOutsideAngular(() => this.scene?.zoom(factor));
  }

  onViewerKeydown(event: KeyboardEvent): void {
    const rotations: Record<string, [number, number]> = {
      ArrowLeft: [-0.16, 0],
      ArrowRight: [0.16, 0],
      ArrowUp: [0, -0.12],
      ArrowDown: [0, 0.12],
    };
    if (rotations[event.key]) {
      event.preventDefault();
      this.zone.runOutsideAngular(() =>
        this.scene?.rotate(...rotations[event.key]),
      );
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.zoom(0.85);
    } else if (event.key === '-') {
      event.preventDefault();
      this.zoom(1.18);
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.selectView('perspective');
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.scene?.dispose();
    this.scene = undefined;
  }
}
