import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FantasyPreview } from './fantasy-preview';

describe('FantasyPreview', () => {
  let component: FantasyPreview;
  let fixture: ComponentFixture<FantasyPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(FantasyPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
