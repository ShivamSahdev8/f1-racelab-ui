export interface TrafficCar { id: number; x: number; y: number; color: string; }
export interface RaceGame {
  x: number;
  cars: TrafficCar[];
  distance: number;
  overtakes: number;
  elapsed: number;
  spawnIn: number;
  nextId: number;
  crashed: boolean;
}

export const PLAYER_Y = 348;
export const LANES = [84, 180, 276];
const COLORS = ['#27d7c4', '#f5bd4f', '#5a8cff', '#c39bff'];

export function createRace(): RaceGame {
  return { x: 180, cars: [], distance: 0, overtakes: 0, elapsed: 0, spawnIn: .35, nextId: 0, crashed: false };
}

export function carsOverlap(x: number, y: number, otherX: number, otherY: number): boolean {
  // A small inset makes near misses feel fair around the wings and tyres.
  return Math.abs(x - otherX) < 27 && Math.abs(y - otherY) < 46;
}

export function raceSpeed(elapsed: number): number {
  return Math.min(270, 145 + elapsed * 1.7);
}

export function advanceRace(state: RaceGame, elapsed: number, steering: number, random = Math.random): RaceGame {
  if (state.crashed) return state;
  // Background tabs cannot jump traffic through the player's collision box.
  const dt = Math.max(0, Math.min(elapsed, .05));
  const speed = raceSpeed(state.elapsed);
  const x = Math.max(44, Math.min(316, state.x + Math.max(-1, Math.min(1, steering)) * 225 * dt));
  let cars = state.cars.map(car => ({ ...car, y: car.y + speed * dt }));
  const crashed = cars.some(car => carsOverlap(x, PLAYER_Y, car.x, car.y));
  const passed = cars.filter(car => car.y > 480).length;
  cars = cars.filter(car => car.y <= 480);
  let spawnIn = state.spawnIn - dt;
  let nextId = state.nextId;
  if (spawnIn <= 0 && !crashed) {
    // One car per wave: there is always room beside it, never a solid roadblock.
    const lane = Math.min(LANES.length - 1, Math.floor(Math.max(0, random()) * LANES.length));
    if (cars.every(car => car.y > 90)) {
      cars = [...cars, { id: nextId++, x: LANES[lane], y: -60, color: COLORS[lane] }];
    }
    spawnIn = Math.max(.8, 1.25 - state.elapsed * .004);
  }
  return {
    x, cars, crashed, nextId, spawnIn,
    elapsed: state.elapsed + dt,
    distance: state.distance + speed * dt * .28,
    overtakes: state.overtakes + passed,
  };
}
