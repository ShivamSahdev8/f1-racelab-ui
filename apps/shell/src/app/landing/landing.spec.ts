import { Router } from '@angular/router';
import { Landing } from './landing';

jest.mock('gsap', () => ({ __esModule: true, default: { registerPlugin: jest.fn() } }));
jest.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));

describe('Landing', () => {
  it('opens prediction directly from the landing call to action', () => {
    const router = { navigate: jest.fn().mockResolvedValue(true) };
    const component = new Landing(router as unknown as Router);

    component.enterApp();

    expect(router.navigate).toHaveBeenCalledWith(['/predictor']);
  });
});
