"use client";

import { useEffect, useMemo, useState } from "react";
import AuthStatus from "@/components/AuthStatus";
import type { DbCourse } from "@/lib/navigation/dbTypes";
import { fetchCourses } from "@/lib/supabase/queries";
import { getSession } from "@/lib/supabase/session";
import {
  abandonLiveRace,
  fetchLiveRaceSession,
  finishLiveRace,
  publishLiveRaceSession,
  startLiveCountdown,
  startLiveRaceNow,
  type LiveRaceSession,
} from "@/lib/supabase/raceOfficer";
import HomeButton from "@/components/HomeButton";

const COUNTDOWN_PRESETS = [
  { label: "10 min", seconds: 600 },
  { label: "5 min", seconds: 300 },
  { label: "2 min", seconds: 120 },
  { label: "1 min", seconds: 60 },
];

function formatDateTime(value: string | null) {
  if (!value) return "--";
  return new Date(value).toLocaleString();
}

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function RaceOfficerPage() {
  const [mounted, setMounted] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [countdownSeconds, setCountdownSeconds] = useState(600);

  const [liveSession, setLiveSession] = useState<LiveRaceSession | null>(null);

  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

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
    setMounted(true);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setCheckingAuth(true);
        setLoading(true);
        setError(null);

        const session = await getSession();
        const currentUserId = session?.user?.id ?? null;
        setUserId(currentUserId);

        const [courseRows, sessionRow] = await Promise.all([
          fetchCourses(),
          fetchLiveRaceSession(),
        ]);

        setCourses(courseRows);
        setLiveSession(sessionRow);

        if (sessionRow?.course_id) {
          setSelectedCourseId(sessionRow.course_id);
        } else if (courseRows.length > 0) {
          setSelectedCourseId(courseRows[0].id);
        }

        if (sessionRow?.countdown_seconds) {
          setCountdownSeconds(sessionRow.countdown_seconds);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load race officer controls.");
      } finally {
        setCheckingAuth(false);
        setLoading(false);
      }
    }

    load();
  }, []);

  async function refreshLiveSession() {
    const sessionRow = await fetchLiveRaceSession();
    setLiveSession(sessionRow);
    return sessionRow;
  }

  async function handlePublishRace() {
    if (!userId || !selectedCourse) return;

    try {
      setBusyAction("publish");
      setMessage(null);
      setError(null);

      const row = await publishLiveRaceSession({
        userId,
        courseId: selectedCourse.id,
        courseCode: selectedCourse.code,
        countdownSeconds,
      });

      setLiveSession(row);
      setMessage("Live race published.");
    } catch (err: unknown) {
  console.error("Publish failed:", err);

  if (err instanceof Error) {
    setError(err.message);
  } else {
    setError(`Unexpected error: ${JSON.stringify(err)}`);
  }
} finally {
  setBusyAction(null);
}
  }

  async function handleStartCountdown() {
    try {
      setBusyAction("countdown");
      setMessage(null);
      setError(null);

      const sessionRow = liveSession ?? (await refreshLiveSession());
      if (!sessionRow) {
        setError("Publish a live race first.");
        return;
      }

      const row = await startLiveCountdown(sessionRow.id, countdownSeconds);
      setLiveSession(row);
      setMessage("Countdown started.");
    } catch (err) {
      console.error(err);
      setError("Failed to start countdown.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleStartRaceNow() {
    try {
      setBusyAction("start-now");
      setMessage(null);
      setError(null);

      const sessionRow = liveSession ?? (await refreshLiveSession());
      if (!sessionRow) {
        setError("Publish a live race first.");
        return;
      }

      const row = await startLiveRaceNow(sessionRow.id);
      setLiveSession(row);
      setMessage("Race started immediately.");
    } catch (err) {
      console.error(err);
      setError("Failed to start race.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleFinishRace() {
    try {
      setBusyAction("finish");
      setMessage(null);
      setError(null);

      const sessionRow = liveSession ?? (await refreshLiveSession());
      if (!sessionRow) {
        setError("No live race to finish.");
        return;
      }

      await finishLiveRace(sessionRow.id);
      setLiveSession(null);
      setMessage("Race finished.");
    } catch (err) {
      console.error(err);
      setError("Failed to finish race.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAbandonRace() {
    try {
      setBusyAction("abandon");
      setMessage(null);
      setError(null);

      const sessionRow = liveSession ?? (await refreshLiveSession());
      if (!sessionRow) {
        setError("No live race to abandon.");
        return;
      }

      await abandonLiveRace(sessionRow.id);
      setLiveSession(null);
      setMessage("Race abandoned.");
    } catch (err) {
      console.error(err);
      setError("Failed to abandon race.");
    } finally {
      setBusyAction(null);
    }
  }

  if (!mounted || checkingAuth) {
    return (
      <main className="min-h-screen bg-black p-4 text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <h1 className="text-3xl font-bold tracking-tight">Race Officer</h1>
          <p className="mt-3 text-zinc-300">Loading...</p>
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-black p-4 text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <h1 className="text-3xl font-bold tracking-tight">Race Officer</h1>
          <p className="mt-3 text-zinc-300">You need to sign in first.</p>
          <div className="mt-4">
            <AuthStatus />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <div className="pt-6">
  <div className="flex items-center justify-between gap-3">
    <HomeButton />
    <div className="text-right">
      <h1 className="text-3xl font-bold tracking-tight">Race Officer</h1>
      <p className="mt-2 text-zinc-300">
        Publish the course, control the countdown, and start the race.
      </p>
    </div>
  </div>
</div>

        <div className="mt-4">
          <AuthStatus />
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-zinc-300">Loading controls...</p>
          </div>
        ) : (
          <>
            <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm font-medium text-zinc-200">Race Setup</p>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-lg text-white"
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.family_name} {course.course_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-sm font-medium text-zinc-300">
                  Countdown
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {COUNTDOWN_PRESETS.map((preset) => (
                    <button
                      key={preset.seconds}
                      type="button"
                      onClick={() => setCountdownSeconds(preset.seconds)}
                      className={`h-12 rounded-2xl text-sm font-semibold ${
                        countdownSeconds === preset.seconds
                          ? "bg-white text-black"
                          : "border border-zinc-700 bg-zinc-900 text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handlePublishRace}
                disabled={!selectedCourse || !!busyAction}
                className="mt-5 h-14 w-full rounded-2xl bg-blue-500 text-lg font-bold text-white disabled:opacity-50"
              >
                {busyAction === "publish" ? "Publishing..." : "Publish Live Race"}
              </button>
            </section>

            <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm font-medium text-zinc-200">Live Session</p>

              {liveSession ? (
                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <p>
                    Status:{" "}
                    <span className="font-semibold text-white">{liveSession.status}</span>
                  </p>
                  <p>
                    Course:{" "}
                    <span className="font-semibold text-white">
                      {liveSession.course_code ?? "--"}
                    </span>
                  </p>
                  <p>
                    Countdown:{" "}
                    <span className="font-semibold text-white">
                      {liveSession.countdown_seconds ?? 0}s
                    </span>
                  </p>
                  <p>
                    Countdown Start:{" "}
                    <span className="text-zinc-400">
                      {formatDateTime(liveSession.countdown_started_at)}
                    </span>
                  </p>
                  <p>
                    Race Start:{" "}
                    <span className="text-zinc-400">
                      {formatDateTime(liveSession.race_started_at)}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-400">No live race published.</p>
              )}
            </section>

            {liveSession ? (
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
                  Official Countdown
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
                    ? "Countdown not started yet"
                    : liveSession.status === "countdown"
                      ? isFinalTenSeconds
                        ? "Final ten-second count"
                        : "Use this timer for radio countdown calls"
                      : liveSession.status === "started"
                        ? "Race started"
                        : "Live race loaded"}
                </p>
              </section>
            ) : null}

            <section className="mt-4 grid grid-cols-1 gap-3">
              <button
                onClick={handleStartCountdown}
                disabled={!liveSession || !!busyAction}
                className="h-16 rounded-2xl bg-white text-lg font-bold text-black disabled:opacity-50"
              >
                {busyAction === "countdown" ? "Starting..." : "Start Countdown"}
              </button>

              <button
                onClick={handleStartRaceNow}
                disabled={!liveSession || !!busyAction}
                className="h-14 rounded-2xl border border-zinc-700 bg-zinc-900 text-base font-semibold text-white disabled:opacity-50"
              >
                {busyAction === "start-now" ? "Starting..." : "Start Race Now"}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleFinishRace}
                  disabled={!liveSession || !!busyAction}
                  className="h-14 rounded-2xl border border-zinc-700 bg-zinc-900 text-base font-semibold text-white disabled:opacity-50"
                >
                  {busyAction === "finish" ? "Finishing..." : "Finish Race"}
                </button>

                <button
                  onClick={handleAbandonRace}
                  disabled={!liveSession || !!busyAction}
                  className="h-14 rounded-2xl border border-red-900 bg-red-950 text-base font-semibold text-red-100 disabled:opacity-50"
                >
                  {busyAction === "abandon" ? "Abandoning..." : "Abandon Race"}
                </button>
              </div>
            </section>

            {message ? <p className="mt-4 text-green-400">{message}</p> : null}
            {error ? <p className="mt-2 text-red-400">{error}</p> : null}
          </>
        )}
      </div>
    </main>
  );
}
