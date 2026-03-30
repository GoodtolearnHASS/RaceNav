"use client";

import { useEffect, useState } from "react";
import { useGpsPosition } from "@/lib/gps/useGpsPosition";
import { buildRaceMetrics } from "@/lib/navigation/metrics";
import {
  formatDegrees,
  formatEta,
  formatKnots,
  formatNm,
} from "@/lib/navigation/format";
import { useRaceStore } from "@/lib/store/raceStore";

export default function RacePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedCourse = useRaceStore((state) => state.selectedCourse);
  const boatClass = useRaceStore((state) => state.boatClass);
  const resolvedLegs = useRaceStore((state) => state.resolvedLegs);
  const activeLegIndex = useRaceStore((state) => state.activeLegIndex);
  const nextLeg = useRaceStore((state) => state.nextLeg);
  const previousLeg = useRaceStore((state) => state.previousLeg);
  const resetRace = useRaceStore((state) => state.resetRace);

  const activeLeg = resolvedLegs[activeLegIndex] ?? null;
  const nextLegItem = resolvedLegs[activeLegIndex + 1] ?? null;

  const { position, error, loading } = useGpsPosition();

  const metrics = buildRaceMetrics(position, resolvedLegs, activeLegIndex);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-black text-white p-4">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <p className="text-lg">Loading race screen...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <div className="pt-6">
          <p className="text-sm uppercase tracking-widest text-zinc-400">
            {selectedCourse?.code ?? "No Course"} · {boatClass}
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {selectedCourse?.name ?? "Race"}
          </h1>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              GPS Status
            </p>

            {loading ? (
              <p className="mt-2 text-sm text-zinc-300">Waiting for position...</p>
            ) : error ? (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            ) : (
              <div className="mt-2 space-y-1 text-sm text-zinc-300">
                <p>
                  Lat/Lon: {position?.lat.toFixed(5)}, {position?.lon.toFixed(5)}
                </p>
                <p>Accuracy: {position?.accuracyM?.toFixed(0) ?? "--"} m</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-widest text-zinc-500">
            Active Mark
          </p>
          <p className="mt-3 text-5xl font-bold">
            {activeLeg?.mark.code ?? "-"}
          </p>
          <p className="mt-2 text-xl text-zinc-300">
            {activeLeg?.mark.name ?? "No active mark"}
          </p>
        </div>

        <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-widest text-zinc-500">
            Next Mark
          </p>
          <p className="mt-3 text-3xl font-bold">
            {nextLegItem?.mark.code ?? "-"}
          </p>
          <p className="mt-2 text-lg text-zinc-300">
            {nextLegItem?.mark.name ?? "No next mark"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Bearing
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatDegrees(metrics.bearingToActiveDeg)}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Distance
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatNm(metrics.distanceToActiveNm)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">nm</p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              SOG
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatKnots(metrics.sogKnots)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">kt</p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              COG
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatDegrees(metrics.cogTrueDeg)}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              VMC
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatKnots(metrics.vmcKnots)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">kt</p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              ETA
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatEta(metrics.etaSeconds)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-widest text-zinc-500">Leg</p>
          <p className="mt-3 text-3xl font-bold">
            {resolvedLegs.length === 0
              ? "0 / 0"
              : `${activeLegIndex + 1} / ${resolvedLegs.length}`}
          </p>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-3 py-6">
          <button
            onClick={previousLeg}
            className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-lg font-semibold"
          >
            Prev
          </button>

          <button
            onClick={resetRace}
            className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-lg font-semibold"
          >
            Reset
          </button>

          <button
            onClick={nextLeg}
            className="rounded-2xl bg-white p-4 text-lg font-bold text-black"
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
}