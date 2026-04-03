"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DbCourse, DbCourseLeg, DbMark } from "@/lib/navigation/dbTypes";
import { fetchCourseLegs, fetchCourses, fetchMarks } from "@/lib/supabase/queries";
import { mapDbCourseToCourse, mapDbMarkToMark } from "@/lib/navigation/mappers";
import { useRaceStore } from "@/lib/store/raceStore";
import { useGpsPosition } from "@/lib/gps/useGpsPosition";
import { buildRaceMetrics } from "@/lib/navigation/metrics";
import { formatDegrees } from "@/lib/navigation/format";
import { resolveCourseForClass } from "@/lib/navigation/courseResolver";
import {
  fetchLiveRaceSession,
  type LiveRaceSession,
} from "@/lib/supabase/raceOfficer";
import HomeButton from "@/components/HomeButton";
import { useScreenWakeLock } from "@/lib/device/useScreenWakeLock";

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function RaceModePage() {
  const router = useRouter();
  useScreenWakeLock(true);

  const startRace = useRaceStore((state) => state.startRace);
  const setRaceStartedAt = useRaceStore((state) => state.setRaceStartedAt);
  const setRaceSessionId = useRaceStore((state) => state.setRaceSessionId);
  const boatClass = useRaceStore((state) => state.boatClass);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dbCourses, setDbCourses] = useState<DbCourse[]>([]);
  const [dbCourseLegs, setDbCourseLegs] = useState<DbCourseLeg[]>([]);
  const [dbMarks, setDbMarks] = useState<DbMark[]>([]);

  const [liveSession, setLiveSession] = useState<LiveRaceSession | null>(null);
  const [now, setNow] = useState(Date.now());

  const { position, error: gpsError, loading: gpsLoading } = useGpsPosition();

  async function loadRaceModeData(options?: { background?: boolean }) {
    try {
      if (!options?.background) {
        setLoading(true);
      }
      setError(null);

      const [courses, courseLegs, marks, session] = await Promise.all([
        fetchCourses(),
        fetchCourseLegs(),
        fetchMarks(),
        fetchLiveRaceSession(),
      ]);

      setDbCourses(courses);
      setDbCourseLegs(courseLegs);
      setDbMarks(marks);
      setLiveSession(session);
      setRaceSessionId(session?.id ?? null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load race mode.");
    } finally {
      if (!options?.background) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void loadRaceModeData();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadRaceModeData({ background: true });
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const selectedDbCourse =
    dbCourses.find((course) => course.id === liveSession?.course_id) ?? null;

  const selectedDbCourseLegs = selectedDbCourse
    ? dbCourseLegs.filter((leg) => leg.course_id === selectedDbCourse.id)
    : [];

  const selectedCourse =
    selectedDbCourse != null
      ? mapDbCourseToCourse(selectedDbCourse, selectedDbCourseLegs)
      : null;

  const marks = useMemo(
    () =>
      dbMarks
        .filter(
          (mark) => mark.latitude_decimal != null && mark.longitude_decimal != null
        )
        .map(mapDbMarkToMark),
    [dbMarks]
  );

  const resolvedPreviewLegs =
    selectedCourse && marks.length
      ? resolveCourseForClass(selectedCourse, boatClass, marks)
      : [];

  const previewMetrics = buildRaceMetrics(position, resolvedPreviewLegs, 0);
  const firstLeg = resolvedPreviewLegs[0] ?? null;

  const raceStartMs = liveSession?.race_started_at
    ? new Date(liveSession.race_started_at).getTime()
    : null;

  const remainingSeconds =
    raceStartMs != null ? Math.max(Math.floor((raceStartMs - now) / 1000), 0) : null;
  const isFinalTenSeconds =
    liveSession?.status === "countdown" &&
    remainingSeconds != null &&
    remainingSeconds <= 10;

  useEffect(() => {
    if (!selectedCourse || !marks.length) return;
    startRace(selectedCourse, boatClass, marks);
  }, [selectedCourse, boatClass, marks, startRace]);

  useEffect(() => {
    if (!selectedCourse || !marks.length || !raceStartMs) return;

    if (liveSession?.status === "started" || remainingSeconds === 0) {
      startRace(selectedCourse, boatClass, marks);
      setRaceStartedAt(raceStartMs);
      router.replace("/race");
    }
  }, [
    selectedCourse,
    marks,
    boatClass,
    raceStartMs,
    remainingSeconds,
    liveSession?.status,
    router,
    setRaceStartedAt,
    startRace,
  ]);

  if (!mounted || loading) {
    return (
      <main className="min-h-screen bg-black p-4 text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <h1 className="text-3xl font-bold tracking-tight">Race Mode</h1>
          <p className="mt-3 text-zinc-300">Loading live race...</p>
        </div>
      </main>
    );
  }

  const gpsLabel = gpsLoading ? "GPS..." : gpsError ? "GPS ERR" : "GPS OK";
  const gpsAccuracy =
    gpsLoading || gpsError ? "--" : `${position?.accuracyM?.toFixed(0) ?? "--"}m`;

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
          Race Mode
        </p>
        <p className="mt-1 text-center text-sm font-medium uppercase tracking-[0.18em] text-zinc-300">
          {boatClass === "cruisers3" ? "Cruisers 3" : "Cruisers 4"}
        </p>
      </div>
    </div>

    <div className="flex justify-end">
      <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            !gpsLoading && !gpsError
              ? "bg-green-400"
              : gpsError
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
	
		
        {error ? (
          <div className="mt-6 rounded-2xl border border-red-800 bg-zinc-950 p-4">
            <p className="text-red-400">{error}</p>
          </div>
        ) : null}

        {!liveSession ? (
          <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
              Live Race
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              Waiting for race officer
            </p>
            <p className="mt-2 text-zinc-300">
              No live race has been published yet.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                    Status
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {liveSession.status}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                    Course
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {liveSession.course_code ?? "--"}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                    Bearing to Mark
                  </p>
                  <p className="mt-3 text-4xl font-bold leading-none tracking-tight text-white">
                    {formatDegrees(previewMetrics.bearingToActiveDeg)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                    COG
                  </p>
                  <p className="mt-3 text-4xl font-bold leading-none tracking-tight text-white">
                    {formatDegrees(previewMetrics.cogTrueDeg)}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-4 grid grid-cols-2 gap-3">
              <MetricCard
                label="Active Mark"
                value={firstLeg?.mark.code ?? "-"}
              />
              <MetricCard
                label="Distance"
                value={previewMetrics.distanceToActiveNm != null
                  ? `${previewMetrics.distanceToActiveNm.toFixed(2)} nm`
                  : "--"}
              />
            </section>

            <section
              className={`mt-4 rounded-3xl border p-6 text-center ${
                isFinalTenSeconds
                  ? "border-red-700 bg-red-950/60"
                  : "border-zinc-800 bg-zinc-950"
              }`}
            >
              <p
                className={`text-xs uppercase tracking-[0.22em] ${
                  isFinalTenSeconds ? "text-red-200" : "text-zinc-500"
                }`}
              >
                Countdown
              </p>
              <p
                className={`mt-4 font-bold tabular-nums tracking-tight text-white ${
                  isFinalTenSeconds ? "text-8xl" : "text-7xl"
                }`}
              >
                {remainingSeconds != null ? formatCountdown(remainingSeconds) : "--:--"}
              </p>
              <p
                className={`mt-4 text-sm ${
                  isFinalTenSeconds ? "text-red-100" : "text-zinc-400"
                }`}
              >
                {liveSession.status === "waiting"
                  ? "Published and waiting for race officer"
                  : liveSession.status === "countdown"
                    ? isFinalTenSeconds
                      ? "Final ten-second count"
                      : "Official countdown running"
                    : liveSession.status === "started"
                      ? "Race started"
                      : "Live race loaded"}
              </p>
            </section>

            {liveSession.status === "started" ? (
              <button
                onClick={() => {
                  if (!selectedCourse || !marks.length || !raceStartMs) return;
                  startRace(selectedCourse, boatClass, marks);
                  setRaceStartedAt(raceStartMs);
                  router.replace("/race");
                }}
                className="mt-4 h-16 rounded-2xl bg-white text-lg font-bold text-black active:scale-[0.98]"
              >
                Open Race Screen
              </button>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold leading-none tabular-nums text-white">
        {value}
      </p>
    </div>
  );
}
