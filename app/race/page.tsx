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
import HomeButton from "@/components/HomeButton";
import {
  fetchRaceResultForBoat,
  type RaceResultRow,
  saveRaceResult,
} from "@/lib/supabase/results";

function formatRaceTime(ms: number) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

export default function RacePage() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setMounted(true);
  }, []);

  const boatClass = useRaceStore((state) => state.boatClass);
  const resolvedLegs = useRaceStore((state) => state.resolvedLegs);
  const activeLegIndex = useRaceStore((state) => state.activeLegIndex);
  const nextLeg = useRaceStore((state) => state.nextLeg);
  const previousLeg = useRaceStore((state) => state.previousLeg);
  const selectedBoatId = useRaceStore((state) => state.selectedBoatId);
  const selectedBoatName = useRaceStore((state) => state.selectedBoatName);
  const raceSessionId = useRaceStore((state) => state.raceSessionId);
  const raceStartedAt = useRaceStore((state) => state.raceStartedAt);
  const raceEndedAt = useRaceStore((state) => state.raceEndedAt);
  const setRaceEndedAt = useRaceStore((state) => state.setRaceEndedAt);

  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [replaceDialog, setReplaceDialog] = useState<{
    finishedAt: number;
    existingResult: RaceResultRow;
  } | null>(null);

  const activeLeg = resolvedLegs[activeLegIndex] ?? null;
  const nextLegItem = resolvedLegs[activeLegIndex + 1] ?? null;

  const { position, error, loading } = useGpsPosition();
  const metrics = buildRaceMetrics(position, resolvedLegs, activeLegIndex);

  useEffect(() => {
    if (!raceStartedAt || raceEndedAt) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [raceEndedAt, raceStartedAt]);

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

  const elapsedMs =
    raceStartedAt != null
      ? (raceEndedAt ?? now) - raceStartedAt
      : null;

  const raceTime = elapsedMs != null ? formatRaceTime(elapsedMs) : "--:--";
  const raceFinished = raceEndedAt != null;

  async function saveOfficialRaceResult(finishedAt: number) {
    if (!raceStartedAt || !selectedBoatId || !raceSessionId) return;

    const elapsedSeconds = Math.max(
      Math.round((finishedAt - raceStartedAt) / 1000),
      0
    );

    await saveRaceResult({
      raceSessionId,
      boatId: selectedBoatId,
      startedAt: raceStartedAt,
      finishedAt,
      elapsedSeconds,
    });
  }

  async function handleEndMyRace() {
    if (!raceStartedAt || raceFinished) return;

    const finishedAt = Date.now();

    if (!selectedBoatId || !raceSessionId) {
      setRaceEndedAt(finishedAt);
      setSaveMessage("Race ended locally.");
      setSaveError(null);
      return;
    }

    try {
      setSaveBusy(true);
      setSaveError(null);
      setSaveMessage(null);

      const existingResult = await fetchRaceResultForBoat(raceSessionId, selectedBoatId);
      if (existingResult) {
        setReplaceDialog({ finishedAt, existingResult });
        return;
      }

      await saveOfficialRaceResult(finishedAt);
      setRaceEndedAt(finishedAt);
      setSaveMessage("Race result saved.");
    } catch (err) {
      console.error(err);
      setRaceEndedAt(null);
      setSaveError(err instanceof Error ? err.message : "Failed to save race result.");
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleConfirmReplace() {
    if (!replaceDialog) return;

    try {
      setSaveBusy(true);
      setSaveError(null);
      setSaveMessage(null);

      await saveOfficialRaceResult(replaceDialog.finishedAt);
      setRaceEndedAt(replaceDialog.finishedAt);
      setReplaceDialog(null);
      setSaveMessage("Race result replaced.");
    } catch (err) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : "Failed to save race result.");
    } finally {
      setSaveBusy(false);
    }
  }

  function handleCancelReplace() {
    setReplaceDialog(null);
    setSaveMessage("Existing result kept.");
    setSaveError(null);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {replaceDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.22em] text-amber-300">
              Replace Result
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white">
              Existing result found for {selectedBoatName ?? "this boat"}
            </h2>
            <p className="mt-3 text-sm text-zinc-300">
              A saved result already exists for this race. If you replace it, the
              latest elapsed time and operator name will become the saved result.
            </p>
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-300">
              <p>
                Current saved time:{" "}
                <span className="font-semibold text-white">
                  {replaceDialog.existingResult.elapsed_seconds != null
                    ? formatRaceTime(replaceDialog.existingResult.elapsed_seconds * 1000)
                    : "--:--"}
                </span>
              </p>
              <p className="mt-1">
                Last saved by:{" "}
                <span className="font-semibold text-white">
                  {replaceDialog.existingResult.operator_name ?? "Unknown"}
                </span>
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={handleCancelReplace}
                disabled={saveBusy}
                autoFocus
                className="h-12 rounded-2xl bg-white text-sm font-bold text-black disabled:opacity-50"
              >
                Keep Existing
              </button>
              <button
                onClick={handleConfirmReplace}
                disabled={saveBusy}
                className="h-12 rounded-2xl border border-amber-700 bg-amber-950/50 text-sm font-semibold text-amber-100 disabled:opacity-50"
              >
                {saveBusy ? "Saving..." : "Replace Result"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-4">
        
		<header className="sticky top-0 z-20 bg-black/95 pb-3 pt-2 backdrop-blur">
  <div className="grid grid-cols-3 items-center gap-2">
    <div className="flex justify-start">
      <HomeButton />
    </div>

    <div className="flex justify-center">
      <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2">
        <span className="text-sm font-bold tabular-nums text-white">
          Race: {raceTime}
        </span>
      </div>
    </div>

    <div className="flex justify-end">
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
  </div>
</header>
		
		

        <section className="mt-3 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                Bearing to Mark
              </p>
              <p className="mt-3 text-6xl font-bold leading-none tracking-tight text-white">
                {formatDegrees(metrics.bearingToActiveDeg)}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                COG
              </p>
              <div className="mt-2 flex items-end justify-end gap-1">
                <p className="text-3xl font-bold leading-none tabular-nums text-white">
                  {formatDegrees(metrics.cogTrueDeg)}
                </p>
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
            label="Active Mark"
            value={activeLeg?.mark.code ?? "-"}
          />
          <MetricCard
            label="Distance"
            value={formatNm(metrics.distanceToActiveNm)}
            unit="nm"
          />
          <MetricCard
            label="ETA"
            value={formatEta(metrics.etaSeconds)}
          />
        </section>

        {raceFinished ? (
          <section className="mt-4 rounded-3xl border border-emerald-800 bg-emerald-950/40 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">
              My Race Ended
            </p>
            <p className="mt-3 text-4xl font-bold tabular-nums text-white">
              {raceTime}
            </p>
            <p className="mt-2 text-sm text-emerald-100/80">
              Elapsed time is frozen until you start another race.
            </p>
          </section>
        ) : null}

        {saveMessage ? <p className="mt-4 text-sm text-emerald-300">{saveMessage}</p> : null}
        {saveError ? <p className="mt-4 text-sm text-red-400">{saveError}</p> : null}

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
            onClick={handleEndMyRace}
            disabled={saveBusy || raceFinished || !raceStartedAt}
            className="h-16 rounded-2xl border border-red-900 bg-red-950 text-base font-semibold text-red-100 active:scale-[0.98] disabled:opacity-50"
          >
            {raceFinished ? "Race Ended" : saveBusy ? "Saving..." : "End My Race"}
          </button>

          <button
            onClick={previousLeg}
            disabled={raceFinished}
            className="h-16 rounded-2xl border border-zinc-700 bg-zinc-900 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-50"
          >
            Previous
          </button>

          <button
            onClick={nextLeg}
            disabled={raceFinished}
            className="h-16 rounded-2xl bg-white text-base font-bold text-black active:scale-[0.98] disabled:opacity-50"
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
