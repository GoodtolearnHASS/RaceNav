import type { RaceMetrics, RacePosition, ResolvedLeg } from "./types";
import { angleDeltaDegrees, bearingDegrees, distanceNm } from "./geo";

export function computeVmcKnots(
  sogKnots: number,
  cogTrueDeg: number,
  bearingToMarkDeg: number
): number {
  const delta = angleDeltaDegrees(cogTrueDeg, bearingToMarkDeg);
  return sogKnots * Math.cos((delta * Math.PI) / 180);
}

export function computeEtaSeconds(
  distanceToMarkNm: number,
  closingSpeedKnots: number
): number | null {
  if (closingSpeedKnots <= 0) return null;
  return (distanceToMarkNm / closingSpeedKnots) * 3600;
}

export function buildRaceMetrics(
  position: RacePosition | null,
  resolvedLegs: ResolvedLeg[],
  activeLegIndex: number
): RaceMetrics {
  const activeLeg = resolvedLegs[activeLegIndex] ?? null;
  const nextLeg = resolvedLegs[activeLegIndex + 1] ?? null;

  if (!position || !activeLeg) {
    return {
      activeMarkName: activeLeg?.mark.name ?? null,
      nextMarkName: nextLeg?.mark.name ?? null,
      bearingToActiveDeg: null,
      distanceToActiveNm: null,
      sogKnots: position?.sogKnots ?? null,
      cogTrueDeg: position?.cogTrue ?? null,
      vmcKnots: null,
      etaSeconds: null,
    };
  }

  const bearing = bearingDegrees(
    position.lat,
    position.lon,
    activeLeg.mark.position.lat,
    activeLeg.mark.position.lon
  );

  const distance = distanceNm(
    position.lat,
    position.lon,
    activeLeg.mark.position.lat,
    activeLeg.mark.position.lon
  );

  const sog = position.sogKnots ?? null;
  const cog = position.cogTrue ?? null;

  const vmc =
    sog != null && cog != null ? computeVmcKnots(sog, cog, bearing) : null;

  const eta =
    vmc != null && vmc > 0
      ? computeEtaSeconds(distance, vmc)
      : sog != null && sog > 0
      ? computeEtaSeconds(distance, sog)
      : null;

  return {
    activeMarkName: activeLeg.mark.name,
    nextMarkName: nextLeg?.mark.name ?? null,
    bearingToActiveDeg: bearing,
    distanceToActiveNm: distance,
    sogKnots: sog,
    cogTrueDeg: cog,
    vmcKnots: vmc,
    etaSeconds: eta,
  };
}