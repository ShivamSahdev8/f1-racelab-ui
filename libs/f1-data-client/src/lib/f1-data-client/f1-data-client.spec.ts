import { ComponentFixture, TestBed } from '@angular/core/testing';
import { F1DataClient } from './f1-data-client';

describe('F1DataClient', () => {
  let component: F1DataClient;
  let fixture: ComponentFixture<F1DataClient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [F1DataClient],
    }).compileComponents();

    fixture = TestBed.createComponent(F1DataClient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
