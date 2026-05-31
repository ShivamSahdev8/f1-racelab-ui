import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PredictorPreview } from './predictor-preview';

describe('PredictorPreview', () => {
  let component: PredictorPreview;
  let fixture: ComponentFixture<PredictorPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PredictorPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(PredictorPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
