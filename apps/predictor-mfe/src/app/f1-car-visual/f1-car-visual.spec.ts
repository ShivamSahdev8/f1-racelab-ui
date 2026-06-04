import { ComponentFixture, TestBed } from '@angular/core/testing';
import { F1CarVisual } from './f1-car-visual';

describe('F1CarVisual', () => {
  let component: F1CarVisual;
  let fixture: ComponentFixture<F1CarVisual>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [F1CarVisual],
    }).compileComponents();

    fixture = TestBed.createComponent(F1CarVisual);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
