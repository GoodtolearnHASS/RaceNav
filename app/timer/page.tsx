"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRaceStore } from "@/lib/store/raceStore";
import { useGpsPosition } from "@/lib/gps/useGpsPosition";
import { buildRaceMetrics } from "@/lib/navigation/metrics";
import { formatDegrees } from "@/lib/navigation/format";
import HomeButton from "@/components/HomeButton";

const PRESETS = [
  { label: "10", seconds: 600 },
  { label: "5", seconds: 300 },
  { label: "2", seconds: 120 },
  { label: "1", seconds: 60 },
];

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function TimerPage() {
  const router = useRouter();

  const boatClass = useRaceStore((state) => state.boatClass);
  const resolvedLegs = useRaceStore((state) => state.resolvedLegs);

  const countdownSeconds = useRaceStore((state) => state.countdownSeconds);
  const countdownRunning = useRaceStore((state) => state.countdownRunning);
  const raceStartedAt = useRaceStore((state) => state.raceStartedAt);

  const setCountdownPreset = useRaceStore((state) => state.setCountdownPreset);
  const startCountdown = useRaceStore((state) => state.startCountdown);
  const pauseCountdown = useRaceStore((state) => state.pauseCountdown);
  const resetCountdown = useRaceStore((state) => state.resetCountdown);
  const tickCountdown = useRaceStore((state) => state.tickCountdown);
  const startRaceClock = useRaceStore((state) => state.startRaceClock);

  const { position, error, loading } = useGpsPosition();

  const firstLeg = resolvedLegs[0] ?? null;
  const metrics = buildRaceMetrics(position, resolvedLegs, 0);

  useEffect(() => {
    if (!countdownRunning) return;

    const interval = window.setInterval(() => {
      tickCountdown();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [countdownRunning, tickCountdown]);

  useEffect(() => {
    if (countdownSeconds !== 0) return;
    if (!resolvedLegs.length) return;
    if (raceStartedAt) return;

    startRaceClock();
    router.replace("/race");
  }, [countdownSeconds, resolvedLegs.length, raceStartedAt, router, startRaceClock]);

  const gpsLabel = loading ? "GPS..." : error ? "GPS ERR" : "GPS OK";
  const gpsAccuracy =
    loading || error ? "--" : `${position?.accuracyM?.toFixed(0) ?? "--"}m`;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-8 pt-4">
        
		<header className="sticky top-0 z-20 bg-black/95 pb-3 pt-2 backdrop-blur">
  <div className="grid grid-cols-3 items-center gap-2">
    <div className="flex justify-start">
      <HomeButton />
    </div>

    <div className="flex justify-center">
      <div>
        <p className="text-center text-xs uppercase tracking-[0.22em] text-zinc-500">
          Start Timer
        </p>
        <p className="mt-1 text-center text-sm font-medium uppercase tracking-[0.18em] text-zinc-300">
          {boatClass || "No Class"}
        </p>
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
		
        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
            First Mark
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {firstLeg?.mark.name ?? "No first mark"}
          </p>
          <p className="mt-3 text-sm text-zinc-300">
            Bearing to First Mark{" "}
            <span className="font-semibold text-white">
              {formatDegrees(metrics.bearingToActiveDeg)}
            </span>
          </p>
        </section>

        <section className="mt-4 grid grid-cols-4 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.seconds}
              onClick={() => setCountdownPreset(preset.seconds)}
              className="h-14 rounded-2xl border border-zinc-700 bg-zinc-950 text-lg font-semibold text-white active:scale-[0.98]"
            >
              {preset.label}
            </button>
          ))}
        </section>

        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
            Countdown
          </p>
          <p className="mt-4 text-7xl font-bold tabular-nums tracking-tight text-white">
            {formatCountdown(countdownSeconds)}
          </p>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3">
  <button
    onClick={startCountdown}
    className="h-16 rounded-2xl bg-white text-lg font-bold text-black active:scale-[0.98]"
  >
    Start Timer
  </button>

  <div className="grid grid-cols-2 gap-3">
    <button
      onClick={pauseCountdown}
      className="h-14 rounded-2xl border border-zinc-700 bg-zinc-900 text-base font-semibold text-white active:scale-[0.98]"
    >
      Pause
    </button>

    <button
      onClick={resetCountdown}
      className="h-14 rounded-2xl border border-zinc-700 bg-zinc-900 text-base font-semibold text-white active:scale-[0.98]"
    >
      Reset
    </button>
  </div>

  <button
    onClick={() => {
      startRaceClock();
      router.replace("/race");
    }}
    className="h-14 rounded-2xl border border-zinc-700 bg-zinc-900 text-base font-semibold text-white active:scale-[0.98]"
  >
    Start Race Now
  </button>
</section>	
      </div>
    </main>
  );
}