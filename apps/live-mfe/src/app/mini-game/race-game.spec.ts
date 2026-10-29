import { advanceRace, carsOverlap, createRace, LANES, PLAYER_Y, raceSpeed } from './race-game';

describe('Paddock arcade simulation', () => {
  it('keeps steering inside the track', () => {
    expect(advanceRace({ ...createRace(), x: 44 }, .05, -1).x).toBe(44);
    expect(advanceRace({ ...createRace(), x: 316 }, .05, 1).x).toBe(316);
  });
  it('detects contact while allowing a close pass in a neighbouring lane', () => {
    expect(carsOverlap(144, PLAYER_Y, 144, PLAYER_Y - 20)).toBe(true);
    expect(carsOverlap(144, PLAYER_Y, 216, PLAYER_Y)).toBe(false);
    const state = { ...createRace(), x: 144, cars: [{ id: 0, x: 144, y: PLAYER_Y - 45, color: 'red' }] };
    expect(advanceRace(state, .05, 0).crashed).toBe(true);
  });
  it('only counts an overtake once the car is safely behind', () => {
    const state = { ...createRace(), cars: [{ id: 0, x: 72, y: 478, color: 'red' }] };
    const next = advanceRace(state, .05, 0);
    expect(next.overtakes).toBe(1);
    expect(advanceRace(next, .05, 0).overtakes).toBe(1);
  });
  it('spawns one car with enough separation and leaves passing lanes free', () => {
    const next = advanceRace({ ...createRace(), spawnIn: 0 }, .05, 0, () => .9);
    expect(next.cars).toHaveLength(1);
    expect(next.cars[0].x).toBe(LANES[2]);
    const blocked = { ...next, spawnIn: 0 };
    expect(advanceRace(blocked, .05, 0, () => .5).cars).toHaveLength(1);
  });
  it('caps frame time and speed, and freezes the simulation after a crash', () => {
    expect(advanceRace(createRace(), 100, 1).elapsed).toBe(.05);
    expect(raceSpeed(10000)).toBe(270);
    const crashed = { ...createRace(), crashed: true };
    expect(advanceRace(crashed, 1, 1)).toBe(crashed);
  });

  it('requires steering when traffic arrives in the starting lane', () => {
    let state = createRace();
    for (let i = 0; i < 100; i++) state = advanceRace(state, .05, 0, () => .5);
    expect(state.crashed).toBe(true);
  });
});
