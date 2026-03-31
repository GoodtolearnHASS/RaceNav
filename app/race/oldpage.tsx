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
      <main className="min-h-screen bg-black px-4 text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <p className="text-lg">Loading race screen...</p>
        </div>
      </main>
    );
  }

  const gpsLabel = loading ? "GPS..." : error ? "GPS ERR" : "GPS OK";
  const gpsAccuracy =
    loading || error ? "--" : `${position?.accuracyM?.toFixed(0) ?? "--"}m`;

  const legText =
    resolvedLegs.length === 0
      ? "0 / 0"
      : `${activeLegIndex + 1} / ${resolvedLegs.length}`;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-4">
        <header className="sticky top-0 z-20 bg-black/95 pb-3 pt-2 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                Race Nav
              </p>
              <p className="mt-1 text-sm font-medium uppercase tracking-[0.18em] text-zinc-300">
                {boatClass || "No Class"}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  !loading && !error
                    ? "bg-green-400"
                    : error
                      ? "bg-red-400"
                      : "bg-amber-400"
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-200">
                {gpsLabel}
              </span>
              <span className="text-xs text-zinc-400">{gpsAccuracy}</span>
            </div>
          </div>
        </header>

        <section className="mt-3 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                Active Mark
              </p>
              <p className="mt-3 text-6xl font-bold leading-none tracking-tight text-white">
                {activeLeg?.mark.code ?? "-"}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Distance to Mark
              </p>
              <div className="mt-2 flex items-end justify-end gap-1">
                <p className="text-3xl font-bold leading-none tabular-nums text-white">
                  {formatNm(metrics.distanceToActiveNm)}
                </p>
                <span className="pb-0.5 text-sm text-zinc-400">nm</span>
              </div>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <MetricCard
            label="SOG"
            value={formatKnots(metrics.sogKnots)}
            unit="kt"
            strong
          />
          <MetricCard
            label="VMC"
            value={formatKnots(metrics.vmcKnots)}
            unit="kt"
            strong
          />
        </section>

        <section className="mt-3 grid grid-cols-3 gap-3">
          <MetricCard
            label="Bearing to Mark"
            value={formatDegrees(metrics.bearingToActiveDeg)}
          />
          <MetricCard
            label="COG"
            value={formatDegrees(metrics.cogTrueDeg)}
          />
          <MetricCard
            label="ETA"
            value={formatEta(metrics.etaSeconds)}
          />
        </section>

        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                Next Mark
              </p>
              <p className="mt-2 truncate text-xl font-semibold text-zinc-100">
                {nextLegItem?.mark.name ?? "No next mark"}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                Leg
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-white">
                {legText}
              </p>
            </div>
          </div>
        </section>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-black/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-3 px-4 py-4">
          <button
            onClick={previousLeg}
            className="h-16 rounded-2xl border border-zinc-700 bg-zinc-900 text-lg font-semibold text-white active:scale-[0.98]"
          >
            Prev
          </button>

          <button
            onClick={resetRace}
            className="h-16 rounded-2xl border border-zinc-700 bg-zinc-900 text-lg font-semibold text-white active:scale-[0.98]"
          >
            Reset
          </button>

          <button
            onClick={nextLeg}
            className="h-16 rounded-2xl bg-white text-lg font-bold text-black active:scale-[0.98]"
          >
            Next
          </button>
        </div>
      </footer>
    </main>
  );
}

function MetricCard({
  label,
  value,
  unit,
  strong = false,
}: {
  label: string;
  value: string;
  unit?: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <div className="mt-2 flex items-end gap-2">
        <p
          className={`font-bold leading-none tabular-nums text-white ${
            strong ? "text-4xl" : "text-2xl"
          }`}
        >
          {value}
        </p>
        {unit ? <span className="pb-1 text-sm text-zinc-400">{unit}</span> : null}
      </div>
    </div>
  );
}