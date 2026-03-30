"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sampleCourses, sampleMarks } from "@/lib/navigation/sampleData";
import type { BoatClass } from "@/lib/navigation/types";
import { useRaceStore } from "@/lib/store/raceStore";

export default function HomePage() {
  const router = useRouter();
  const startRace = useRaceStore((state) => state.startRace);

  const [mounted, setMounted] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(sampleCourses[0].id);
  const [boatClass, setBoatClass] = useState<BoatClass>("cruisers2");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-black text-white p-4">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight">Race Nav</h1>
          <p className="mt-3 text-zinc-300">Loading…</p>
        </div>
      </main>
    );
  }

  const selectedCourse =
    sampleCourses.find((course) => course.id === selectedCourseId) ?? sampleCourses[0];

  function handleStartRace() {
    startRace(selectedCourse, boatClass, sampleMarks);
    router.push("/race");
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
        <h1 className="text-4xl font-bold tracking-tight">Race Nav</h1>
        <p className="mt-3 text-zinc-300">Select course and class to begin.</p>

        <div className="mt-8 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-lg text-white"
            >
              {sampleCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 block text-sm font-medium text-zinc-300">Class</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBoatClass("cruisers2")}
                className={`rounded-xl p-4 text-lg font-semibold ${
                  boatClass === "cruisers2"
                    ? "bg-white text-black"
                    : "border border-zinc-700 bg-zinc-900 text-white"
                }`}
              >
                Cruisers 2
              </button>

              <button
                type="button"
                onClick={() => setBoatClass("cruisers3")}
                className={`rounded-xl p-4 text-lg font-semibold ${
                  boatClass === "cruisers3"
                    ? "bg-white text-black"
                    : "border border-zinc-700 bg-zinc-900 text-white"
                }`}
              >
                Cruisers 3
              </button>
            </div>
          </div>

          <button
            onClick={handleStartRace}
            className="w-full rounded-2xl bg-blue-500 p-5 text-xl font-bold text-white"
          >
            Start Race
          </button>
        </div>
      </div>
    </main>
  );
}