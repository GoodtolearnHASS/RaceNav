"use client";

import { useEffect, useRef, useState } from "react";
import type { GpsState, RacePosition } from "@/lib/navigation/types";

const METERS_PER_SECOND_TO_KNOTS = 1.9438444924406;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function normalizeDegrees(value: number): number {
  return (value + 360) % 360;
}

function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusM = 6371000;
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dPhi = toRadians(lat2 - lat1);
  const dLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusM * c;
}

function bearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const lambda1 = toRadians(lon1);
  const lambda2 = toRadians(lon2);

  const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);

  return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}

function deriveSogAndCog(
  previous: RacePosition | null,
  current: RacePosition
): Pick<RacePosition, "sogKnots" | "cogTrue"> {
  if (!previous) {
    return {
      sogKnots: current.sogKnots ?? null,
      cogTrue: current.cogTrue ?? null,
    };
  }

  const timeSeconds = (current.timestamp - previous.timestamp) / 1000;
  if (timeSeconds <= 0) {
    return {
      sogKnots: current.sogKnots ?? previous.sogKnots ?? null,
      cogTrue: current.cogTrue ?? previous.cogTrue ?? null,
    };
  }

  const distanceM = distanceMeters(
    previous.lat,
    previous.lon,
    current.lat,
    current.lon
  );

  // Ignore tiny jitter movements.
  if (distanceM < 3) {
    return {
      sogKnots: current.sogKnots ?? previous.sogKnots ?? 0,
      cogTrue: current.cogTrue ?? previous.cogTrue ?? null,
    };
  }

  const speedKnots = (distanceM / timeSeconds) * METERS_PER_SECOND_TO_KNOTS;
  const cog = bearingDegrees(
    previous.lat,
    previous.lon,
    current.lat,
    current.lon
  );

  return {
    sogKnots: current.sogKnots ?? speedKnots,
    cogTrue: current.cogTrue ?? cog,
  };
}

function formatGeolocationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission denied.";
    case error.POSITION_UNAVAILABLE:
      return "Location unavailable.";
    case error.TIMEOUT:
      return "Location request timed out.";
    default:
      return "Unable to get location.";
  }
}

export function useGpsPosition(): GpsState {
  const [state, setState] = useState<GpsState>({
    position: null,
    error: null,
    loading: true,
  });

  const previousPositionRef = useRef<RacePosition | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState({
        position: null,
        error: "Geolocation is not supported by this browser.",
        loading: false,
      });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const rawPosition: RacePosition = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          timestamp: pos.timestamp,
          sogKnots:
            pos.coords.speed == null
              ? null
              : pos.coords.speed * METERS_PER_SECOND_TO_KNOTS,
          cogTrue:
            pos.coords.heading == null || Number.isNaN(pos.coords.heading)
              ? null
              : pos.coords.heading,
          accuracyM: pos.coords.accuracy ?? null,
        };

        const derived = deriveSogAndCog(previousPositionRef.current, rawPosition);

        const enrichedPosition: RacePosition = {
          ...rawPosition,
          sogKnots: derived.sogKnots,
          cogTrue: derived.cogTrue,
        };

        previousPositionRef.current = enrichedPosition;

        setState({
          position: enrichedPosition,
          error: null,
          loading: false,
        });
      },
      (error) => {
        setState({
          position: null,
          error: formatGeolocationError(error),
          loading: false,
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return state;
}