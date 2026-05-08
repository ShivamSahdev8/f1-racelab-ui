import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LiveTiming } from './live-timing';

describe('LiveTiming', () => {
  let component: LiveTiming;
  let fixture: ComponentFixture<LiveTiming>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveTiming],
    }).compileComponents();

    fixture = TestBed.createComponent(LiveTiming);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
