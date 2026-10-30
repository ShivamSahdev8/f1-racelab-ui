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
export const TRACK_MIN_X = 44;
export const TRACK_MAX_X = 316;
export const STEERING_SPEED = 225;
// Lane markings are visual guides; cars and steering can use the whole road.
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
  return Math.min(340, 185 + Math.max(0, elapsed) * 7.75);
}

function collisionDuringStep(playerStart: number, playerEnd: number, car: TrafficCar, travel: number): boolean {
  // Intersect the time intervals in which both axes overlap. Checking only the
  // end of a frame can miss a diagonal contact at the corner of another car.
  const overlapInterval = (start: number, delta: number, extent: number): [number, number] | null => {
    if (Math.abs(delta) < 1e-9) return Math.abs(start) < extent ? [0, 1] : null;
    const a = (-extent - start) / delta;
    const b = (extent - start) / delta;
    return [Math.max(0, Math.min(a, b)), Math.min(1, Math.max(a, b))];
  };
  const horizontal = overlapInterval(playerStart - car.x, playerEnd - playerStart, 27);
  const vertical = overlapInterval(PLAYER_Y - car.y, -travel, 46);
  return !!horizontal && !!vertical && Math.max(horizontal[0], vertical[0]) < Math.min(horizontal[1], vertical[1]);
}

export function advanceRace(state: RaceGame, elapsed: number, steering: number, random = Math.random): RaceGame {
  if (state.crashed) return state;
  // Background tabs cannot jump traffic through the player's collision box.
  const dt = Math.max(0, Math.min(elapsed, .05));
  const speed = raceSpeed(state.elapsed);
  const x = Math.max(TRACK_MIN_X, Math.min(TRACK_MAX_X, state.x + Math.max(-1, Math.min(1, steering)) * STEERING_SPEED * dt));
  const travel = speed * dt;
  let cars = state.cars.map(car => ({ ...car, y: car.y + travel }));
  const crashed = state.cars.some(car => collisionDuringStep(state.x, x, car, travel));
  const passed = cars.filter(car => car.y > 480).length;
  cars = cars.filter(car => car.y <= 480);
  let spawnIn = state.spawnIn - dt;
  let nextId = state.nextId;
  if (spawnIn <= 0 && !crashed) {
    // Alternate broad traffic with a car committed to our current line at spawn.
    // This covers the shoulders and spaces between markings without late homing.
    // A stationary player meets their first committed car in under four seconds.
    const sample = random();
    const unit = Number.isFinite(sample) ? Math.max(0, Math.min(1, sample)) : .5;
    const trafficX = nextId % 2 === 1 ? x : TRACK_MIN_X + unit * (TRACK_MAX_X - TRACK_MIN_X);
    const spawnInterval = Math.max(.6, 1.05 - state.elapsed * .0225);
    // One car per wave, with over 180px between centres. Their 92px collision
    // windows cannot form a wall, and the gap allows a full 54px avoidance move
    // at 225px/s, even at maximum pace. New traffic is visible >0.85s before contact.
    if (cars.every(car => car.y >= 120)) {
      cars = [...cars, { id: nextId, x: trafficX, y: -60, color: COLORS[nextId % COLORS.length] }];
      nextId++;
      spawnIn += spawnInterval;
    } else {
      spawnIn = .05;
    }
  }
  return {
    x, cars, crashed, nextId, spawnIn,
    elapsed: state.elapsed + dt,
    distance: state.distance + speed * dt * .28,
    overtakes: state.overtakes + passed,
  };
}
