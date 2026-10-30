export interface ArcadeDriver {
  id: string;
  name: string;
  number: number;
  abbreviation: string;
}

export interface ArcadeTeam {
  id: string;
  name: string;
  color: string;
  drivers: readonly ArcadeDriver[];
}

/**
 * Static 2026 arcade roster, verified 2026-10-30 against Formula 1's current teams/drivers:
 * https://www.formula1.com/en/teams
 * https://www.formula1.com/en/drivers
 * Numbers, abbreviations and team colors cross-checked with the completed Austin race:
 * https://api.openf1.org/v1/drivers?session_key=11396
 * This offline game snapshot does not claim to provide live entries or driver substitutions.
 */
export const ARCADE_TEAMS: readonly ArcadeTeam[] = [
  {
    id: 'ferrari', name: 'Ferrari', color: '#ED1131',
    drivers: [
      { id: 'leclerc', name: 'Charles Leclerc', number: 16, abbreviation: 'LEC' },
      { id: 'hamilton', name: 'Lewis Hamilton', number: 44, abbreviation: 'HAM' },
    ],
  },
  {
    id: 'mclaren', name: 'McLaren', color: '#F47600',
    drivers: [
      { id: 'norris', name: 'Lando Norris', number: 1, abbreviation: 'NOR' },
      { id: 'piastri', name: 'Oscar Piastri', number: 81, abbreviation: 'PIA' },
    ],
  },
  {
    id: 'red-bull', name: 'Red Bull Racing', color: '#4781D7',
    drivers: [
      { id: 'verstappen', name: 'Max Verstappen', number: 3, abbreviation: 'VER' },
      { id: 'hadjar', name: 'Isack Hadjar', number: 6, abbreviation: 'HAD' },
    ],
  },
  {
    id: 'mercedes', name: 'Mercedes', color: '#00D7B6',
    drivers: [
      { id: 'russell', name: 'George Russell', number: 63, abbreviation: 'RUS' },
      { id: 'antonelli', name: 'Kimi Antonelli', number: 12, abbreviation: 'ANT' },
    ],
  },
  {
    id: 'aston-martin', name: 'Aston Martin', color: '#229971',
    drivers: [
      { id: 'alonso', name: 'Fernando Alonso', number: 14, abbreviation: 'ALO' },
      { id: 'stroll', name: 'Lance Stroll', number: 18, abbreviation: 'STR' },
    ],
  },
  {
    id: 'alpine', name: 'Alpine', color: '#00A1E8',
    drivers: [
      { id: 'gasly', name: 'Pierre Gasly', number: 10, abbreviation: 'GAS' },
      { id: 'colapinto', name: 'Franco Colapinto', number: 43, abbreviation: 'COL' },
    ],
  },
  {
    id: 'williams', name: 'Williams', color: '#1868DB',
    drivers: [
      { id: 'sainz', name: 'Carlos Sainz', number: 55, abbreviation: 'SAI' },
      { id: 'albon', name: 'Alexander Albon', number: 23, abbreviation: 'ALB' },
    ],
  },
  {
    id: 'racing-bulls', name: 'Racing Bulls', color: '#6C98FF',
    drivers: [
      { id: 'lawson', name: 'Liam Lawson', number: 30, abbreviation: 'LAW' },
      { id: 'lindblad', name: 'Arvid Lindblad', number: 41, abbreviation: 'LIN' },
    ],
  },
  {
    id: 'haas', name: 'Haas', color: '#9C9FA2',
    drivers: [
      { id: 'ocon', name: 'Esteban Ocon', number: 31, abbreviation: 'OCO' },
      { id: 'bearman', name: 'Oliver Bearman', number: 87, abbreviation: 'BEA' },
    ],
  },
  {
    id: 'audi', name: 'Audi', color: '#F50537',
    drivers: [
      { id: 'hulkenberg', name: 'Nico Hulkenberg', number: 27, abbreviation: 'HUL' },
      { id: 'bortoleto', name: 'Gabriel Bortoleto', number: 5, abbreviation: 'BOR' },
    ],
  },
  {
    id: 'cadillac', name: 'Cadillac', color: '#909090',
    drivers: [
      { id: 'perez', name: 'Sergio Perez', number: 11, abbreviation: 'PER' },
      { id: 'bottas', name: 'Valtteri Bottas', number: 77, abbreviation: 'BOT' },
    ],
  },
];
