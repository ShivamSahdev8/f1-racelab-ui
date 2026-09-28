import { DriverStanding, Race } from '@f1-racelab/shared-models';
import type { PredictionRequest, PredictionResult, RaceOverview } from './prediction.service';

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

const highDownforce = new Set([
  'Monaco', 'Hungary', 'Singapore', 'Netherlands', 'Mexico', 'Brazil',
]);
const lowDownforce = new Set(['Italy', 'Belgium', 'Azerbaijan', 'Saudi Arabia', 'Las Vegas']);

function recommendedDownforce(circuit: string): string {
  if (highDownforce.has(circuit)) return 'HIGH';
  if (lowDownforce.has(circuit)) return 'LOW';
  return 'MEDIUM';
}

export function estimatePrediction(
  setup: PredictionRequest,
  standings: DriverStanding[],
): PredictionResult {
  const sorted = [...standings].sort((a, b) => a.position - b.position);
  const standing = sorted.find(entry => entry.driver.fullName === setup.driver);
  if (!standing || !sorted.length) {
    throw new Error('Current championship standings are unavailable for this driver.');
  }

  const leaderPoints = Math.max(1, sorted[0].points);
  const rankScore = 1 - (standing.position - 1) / Math.max(1, sorted.length - 1);
  const formScore = clamp(0.55 * rankScore + 0.45 * standing.points / leaderPoints, 0, 1);
  const wetTrack = setup.weather === 'WET';
  const dampTrack = setup.weather === 'DAMP';
  const tyreFit = wetTrack ? setup.tyres === 'WET' : dampTrack
    ? setup.tyres === 'INTERMEDIATE' : ['SOFT', 'MEDIUM', 'HARD'].includes(setup.tyres);
  const idealDownforce = recommendedDownforce(setup.circuit);
  const downforceFit = setup.downforce === idealDownforce;
  const preferredStrategy = wetTrack || dampTrack ? '2-STOP' : '1-STOP';
  const strategyFit = setup.strategy === preferredStrategy;
  const adjustment = (tyreFit ? 2 : -12) + (downforceFit ? 2 : -3) +
    (strategyFit ? 1 : -2);
  const winChance = clamp(Math.round(3 + formScore * 48 + adjustment), 1, 65);
  const podiumChance = clamp(Math.round(12 + formScore * 65 + adjustment), winChance, 91);
  const expectedPosition = clamp(
    Math.round(1 + (1 - formScore) * Math.min(16, sorted.length - 1) - adjustment / 4),
    1, sorted.length,
  );
  const pointsByPosition = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  const optimalTyres = wetTrack ? 'WET' : dampTrack ? 'INTERMEDIATE' : 'MEDIUM';
  const optimalWinChance = clamp(
    winChance + (tyreFit ? 0 : 14) + (downforceFit ? 0 : 5) + (strategyFit ? 0 : 3),
    winChance, 75,
  );
  const mismatch = !tyreFit || !downforceFit || !strategyFit;

  return {
    winChance,
    podiumChance,
    expectedPosition,
    expectedPoints: pointsByPosition[expectedPosition - 1] ?? 0,
    insight: `${setup.driver} is P${standing.position} in the current championship with ${standing.points} points. ` +
      `${tyreFit ? 'Your tyre choice suits the selected conditions.' : 'The selected tyres do not suit the chosen weather.'} ` +
      `${downforceFit ? 'The downforce suits this circuit profile.' : `${idealDownforce} downforce is a closer match for this circuit.`}`,
    riskFactor: !tyreFit ? 'HIGH' : mismatch ? 'MEDIUM' : 'LOW',
    optimalSetup: {
      tyres: optimalTyres,
      strategy: preferredStrategy,
      downforce: idealDownforce,
      winChance: optimalWinChance,
      explanation: `For ${setup.circuit} in ${setup.weather.toLowerCase()} conditions, ` +
        `${optimalTyres.toLowerCase()} tyres, ${idealDownforce.toLowerCase()} downforce, and a ${preferredStrategy.toLowerCase()} plan fit this simple simulator's rules.`,
    },
    funFact: 'This is an illustrative estimate from championship standings and your setup. It is not a calibrated race probability.',
  };
}

export function estimateOverview(races: Race[], standings: DriverStanding[]): RaceOverview {
  if (!races.length || standings.length < 3) {
    throw new Error('The current race calendar or standings are unavailable.');
  }
  const upcoming = races.find(race => race.date >= new Date().toISOString().slice(0, 10)) ?? races[races.length - 1];
  const sorted = [...standings].sort((a, b) => a.position - b.position);
  const contenders = sorted.slice(0, 3);
  const topPoints = Math.max(1, contenders[0].points);
  return {
    race: {
      round: upcoming.round,
      raceName: upcoming.raceName,
      Circuit: { circuitName: upcoming.circuitName },
    },
    prediction: {
      contenders: contenders.map((entry, index) => ({
        position: index + 1,
        driver: entry.driver.fullName,
        team: entry.driver.teamName,
        winChance: clamp(Math.round(15 + 35 * entry.points / topPoints), 10, 50),
        form: index === 0 ? 'HOT' : 'GOOD',
        reason: `P${entry.position} in the current championship with ${entry.points} points.`,
      })),
      safetyCarChance: null,
      rainChance: null,
      darkHorse: {
        driver: sorted[3]?.driver.fullName ?? contenders[2].driver.fullName,
        team: sorted[3]?.driver.teamName ?? contenders[2].driver.teamName,
        reason: 'A contender outside the current championship top three.',
      },
      keyBattle: `${contenders[0].driver.fullName} and ${contenders[1].driver.fullName} lead the championship standings.`,
      circuitInsight: 'Contenders are based on current championship points. Weather and safety car odds are not estimated.',
    },
  };
}
