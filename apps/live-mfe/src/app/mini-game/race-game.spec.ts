import { advanceRace, carsOverlap, createRace, PLAYER_Y, raceSpeed, TRACK_MIN_X, TRACK_MAX_X } from './race-game';

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

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
  it('uses the full road instead of fixed lane centres and leaves passing space', () => {
    const next = advanceRace({ ...createRace(), spawnIn: 0 }, .05, 0, () => .9);
    expect(next.cars).toHaveLength(1);
    expect(next.cars[0].x).toBeCloseTo(288.8);
    const blocked = { ...next, spawnIn: 0 };
    expect(advanceRace(blocked, .05, 0, () => .5).cars).toHaveLength(1);
    expect(advanceRace({ ...createRace(), spawnIn: 0 }, .01, 0, () => 0).cars[0].x).toBe(TRACK_MIN_X);
    expect(advanceRace({ ...createRace(), spawnIn: 0 }, .01, 0, () => 1).cars[0].x).toBe(TRACK_MAX_X);
  });
  it('caps frame time and speed, and freezes the simulation after a crash', () => {
    expect(advanceRace(createRace(), 100, 1).elapsed).toBe(.05);
    expect(raceSpeed(10000)).toBe(340);
    const crashed = { ...createRace(), crashed: true };
    expect(advanceRace(crashed, 1, 1)).toBe(crashed);
  });

  it('requires steering when traffic arrives in the starting lane', () => {
    let state = createRace();
    for (let i = 0; i < 100; i++) state = advanceRace(state, .05, 0, () => .5);
    expect(state.crashed).toBe(true);
  });

  it('reaches full pace in twenty seconds and nearly doubles the traffic density', () => {
    expect(raceSpeed(0)).toBe(185);
    expect(raceSpeed(10)).toBe(262.5);
    expect(raceSpeed(20)).toBe(340);
    const initial = advanceRace({ ...createRace(), spawnIn: 0 }, 0, 0, () => .5);
    const fullPace = advanceRace({ ...createRace(), spawnIn: 0, elapsed: 20 }, 0, 0, () => .5);
    expect(initial.spawnIn).toBe(1.05);
    expect(fullPace.spawnIn).toBeCloseTo(.6);
    // Compared with the former 1.25s opening / ~1.17s at twenty seconds.
    expect(fullPace.spawnIn).toBeLessThan(1.17 / 1.9);
  });

  it('commits alternate traffic to the player line at spawn, without following later', () => {
    const state = { ...createRace(), x: 132.75, nextId: 1, spawnIn: 0 };
    const next = advanceRace(state, .02, 0, () => .99);
    expect(next.cars[0].x).toBe(132.75);
    expect(advanceRace(next, .05, 1).cars[0].x).toBe(132.75);
  });

  it('catches a diagonal contact that begins and ends outside the other car', () => {
    const state = {
      ...createRace(), elapsed: 20, x: 100,
      cars: [{ id: 0, x: 130, y: PLAYER_Y + 40, color: 'red' }],
    };
    expect(carsOverlap(state.x, PLAYER_Y, 130, PLAYER_Y + 40)).toBe(false);
    expect(carsOverlap(111.25, PLAYER_Y, 130, PLAYER_Y + 57)).toBe(false);
    expect(advanceRace(state, .05, 1).crashed).toBe(true);
  });

  it('eliminates every stationary integer parking spot, including both shoulders and lane gaps', () => {
    for (let x = TRACK_MIN_X; x <= TRACK_MAX_X; x++) {
      let state = { ...createRace(), x };
      const random = seededRandom(x + 17);
      for (let tick = 0; tick < 225 && !state.crashed; tick++) state = advanceRace(state, .02, 0, random);
      expect({ x, crashed: state.crashed }).toEqual({ x, crashed: true });
      expect(state.elapsed).toBeLessThan(4.5);
    }
  });

  it.each([
    [1, .02], [7, .02], [31, .02], [67, .02], [143, .02], [389, .02], [1021, .02], [7937, .02],
    [31, .05], [7937, .05], [7, 1 / 60], [389, 1 / 60],
  ])('allows an avoidance driver to survive sustained full-speed traffic (seed %i, frame %f)', (seed, dt) => {
    let state = createRace();
    const random = seededRandom(seed);
    for (let tick = 0; tick < Math.round(90 / dt) && !state.crashed; tick++) {
      // React to the nearest approaching car. Keep a small safety margin and
      // move towards its nearest open side; no foreknowledge of random spawns.
      const threat = state.cars.filter(car => car.y < PLAYER_Y + 46).sort((a, b) => b.y - a.y)[0];
      let steering = 0;
      if (threat && threat.y > 50 && Math.abs(state.x - threat.x) < 31) {
        const left = threat.x - 32;
        const right = threat.x + 32;
        const leftAvailable = left >= TRACK_MIN_X;
        const rightAvailable = right <= TRACK_MAX_X;
        const goLeft = leftAvailable && (!rightAvailable || Math.abs(state.x - left) <= Math.abs(state.x - right));
        steering = goLeft ? -1 : 1;
      }
      state = advanceRace(state, dt, steering, random);
      // Spawned waves cannot overlap vertically at collision height.
      const sorted = [...state.cars].sort((a, b) => b.y - a.y);
      for (let i = 1; i < sorted.length; i++) expect(sorted[i - 1].y - sorted[i].y).toBeGreaterThanOrEqual(180 - 1e-8);
    }
    expect(state.crashed).toBe(false);
    expect(state.overtakes).toBeGreaterThan(120);
    expect(state.elapsed).toBeCloseTo(90);
  });
});
