import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CIRCUIT_SVG_MAP } from './circuit-map';

@Component({
  selector: 'app-circuit-visual',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './circuit-visual.html',
  styleUrl: './circuit-visual.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CircuitVisual implements OnChanges {

  @Input() circuit: string = '';
  @Input() teamColor: string = '#e10600';
  @Input() showStats: boolean = true;

  circuitUrl: string | null = null;
  stats: any = null;
  hasError = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['circuit'] && this.circuit) {
      this.circuitUrl = CIRCUIT_SVG_MAP[this.circuit] || null;
      this.stats = null;
      this.hasError = false;
      this.cdr.detectChanges();
    }
  }

  onImgError(): void {
    this.hasError = true;
    this.cdr.detectChanges();
  }
}