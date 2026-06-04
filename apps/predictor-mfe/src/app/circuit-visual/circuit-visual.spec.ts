import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CircuitVisual } from './circuit-visual';

describe('CircuitVisual', () => {
  let component: CircuitVisual;
  let fixture: ComponentFixture<CircuitVisual>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CircuitVisual],
    }).compileComponents();

    fixture = TestBed.createComponent(CircuitVisual);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
