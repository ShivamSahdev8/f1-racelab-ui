import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-f1-car-visual',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './f1-car-visual.html',
  styleUrl: './f1-car-visual.css'
})
export class F1CarVisualComponent implements OnChanges {

  @Input() driver: string = '';
  @Input() tyres: string = 'SOFT';
  @Input() weather: string = 'DRY';
  @Input() downforce: string = 'HIGH';
  @Input() isLoading: boolean = false;
  @Input() winChance: number = 0;

  teamColor = '#888';
  tyreColor = '#e10600';
  tyreSpeed = '1s';
  rearWingAngle = '15';

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
    'SOFT': '#e10600',
    'MEDIUM': '#ffd700',
    'HARD': '#ffffff',
    'INTERMEDIATE': '#00c800',
    'WET': '#0088ff',
  };

  private tyreSpeeds: Record<string, string> = {
    'SOFT': '0.4s',
    'MEDIUM': '0.7s',
    'HARD': '1.2s',
    'INTERMEDIATE': '0.6s',
    'WET': '0.8s',
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['driver']) {
      this.teamColor = this.teamColors[this.driver] || '#888';
    }
    if (changes['tyres']) {
      this.tyreColor = this.tyreColors[this.tyres] || '#e10600';
      this.tyreSpeed = this.tyreSpeeds[this.tyres] || '0.7s';
    }
    if (changes['downforce']) {
      this.rearWingAngle = this.downforce === 'HIGH' ? '25' :
                           this.downforce === 'MEDIUM' ? '15' : '5';
    }
  }
}