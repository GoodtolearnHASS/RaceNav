export type BoatClass = "cruisers3" | "cruisers4";

export type Coordinates = {
  lat: number;
  lon: number;
};

export type Mark = {
  id: string;
  code: string;
  name: string;
  position: Coordinates;
  notes?: string | null;
};

export type CourseLegToken = {
  markCode: string;
  optionalForShortClass: boolean;
};

export type Course = {
  id: string;
  year: number;
  code: string;
  name: string;
  sequence: CourseLegToken[];
};

export type ResolvedLeg = {
  index: number;
  mark: Mark;
};

export type RacePosition = {
  lat: number;
  lon: number;
  timestamp: number;
  sogKnots?: number | null;
  cogTrue?: number | null;
  accuracyM?: number | null;
};

export type RaceMetrics = {
  activeMarkName: string | null;
  nextMarkName: string | null;
  bearingToActiveDeg: number | null;
  distanceToActiveNm: number | null;
  sogKnots: number | null;
  cogTrueDeg: number | null;
  vmcKnots: number | null;
  etaSeconds: number | null;
};
export type GpsState = {
  position: RacePosition | null;
  error: string | null;
  loading: boolean;
};
