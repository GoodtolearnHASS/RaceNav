"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HomeButton from "@/components/HomeButton";
import type { DbCourse, DbCourseLeg, DbMark } from "@/lib/navigation/dbTypes";
import { fetchCourseLegs, fetchCourses, fetchMarks } from "@/lib/supabase/queries";
import { mapDbCourseToCourse, mapDbMarkToMark } from "@/lib/navigation/mappers";
import { useRaceStore } from "@/lib/store/raceStore";
import { fetchBoats, fetchBoatById, type BoatRow } from "@/lib/supabase/results";
import { getMyProfile } from "@/lib/supabase/profile";
import { getSession } from "@/lib/supabase/session";

export default function ManualPage() {
  const router = useRouter();
  const startRace = useRaceStore((state) => state.startRace);
  const boatClass = useRaceStore((state) => state.boatClass);
  const setBoatClass = useRaceStore((state) => state.setBoatClass);
  const selectedBoatId = useRaceStore((state) => state.selectedBoatId);
  const setSelectedBoat = useRaceStore((state) => state.setSelectedBoat);
  const setRaceSessionId = useRaceStore((state) => state.setRaceSessionId);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbCourses, setDbCourses] = useState<DbCourse[]>([]);
  const [dbCourseLegs, setDbCourseLegs] = useState<DbCourseLeg[]>([]);
  const [dbMarks, setDbMarks] = useState<DbMark[]>([]);
  const [boats, setBoats] = useState<BoatRow[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await getSession();
        if (!session) {
          router.replace("/");
          return;
        }
      } catch (err) {
        console.error(err);
        router.replace("/");
        return;
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;

    async function loadManualPage() {
      try {
        setLoading(true);
        setError(null);

        const [courses, courseLegs, marks, boatRows, profile] = await Promise.all([
          fetchCourses(),
          fetchCourseLegs(),
          fetchMarks(),
          fetchBoats(),
          getMyProfile(),
        ]);

        setDbCourses(courses);
        setDbCourseLegs(courseLegs);
        setDbMarks(marks);
        setBoats(boatRows);

        if (courses.length > 0) {
          setSelectedCourseId(courses[0].id);
        }

        if (!selectedBoatId && profile?.default_boat_id) {
          const preferredBoat =
            boatRows.find((boat) => boat.id === profile.default_boat_id) ??
            (await fetchBoatById(profile.default_boat_id));

          if (preferredBoat) {
            setSelectedBoat(preferredBoat.id, preferredBoat.display_name);
            setBoatClass(
              preferredBoat.boat_class === "cruisers4" ? "cruisers4" : "cruisers3"
            );
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load manual race setup.");
      } finally {
        setLoading(false);
      }
    }

    void loadManualPage();
  }, [checkingAuth, selectedBoatId, setBoatClass, setSelectedBoat]);

  const selectedDbCourse =
    dbCourses.find((course) => course.id === selectedCourseId) ?? null;

  const selectedDbCourseLegs = selectedDbCourse
    ? dbCourseLegs.filter((leg) => leg.course_id === selectedDbCourse.id)
    : [];

  const selectedCourse =
    selectedDbCourse != null
      ? mapDbCourseToCourse(selectedDbCourse, selectedDbCourseLegs)
      : null;

  const marks = dbMarks
    .filter((mark) => mark.latitude_decimal != null && mark.longitude_decimal != null)
    .map(mapDbMarkToMark);

  const selectedBoat =
    boats.find((boat) => boat.id === selectedBoatId) ?? null;
  const selectedBoatClassLabel =
    selectedBoat?.boat_class === "cruisers4" ? "Cruisers 4" : "Cruisers 3";

  async function handleStartManualMode() {
    if (!selectedCourse || !selectedBoatId) return;
    setRaceSessionId(null);
    startRace(selectedCourse, boatClass, marks);
    router.push("/timer");
  }

  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <div className="pt-4">
          <HomeButton />
        </div>

        <div className="pt-6">
          <h1 className="text-4xl font-bold tracking-tight">Racing Practice</h1>
          <p className="mt-3 text-zinc-300">
            Choose a course and run your own timer.
          </p>
        </div>

        {checkingAuth || loading ? (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-zinc-300">Loading manual setup...</p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-800 bg-zinc-950 p-4">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <section className="mt-8 rounded-3xl border border-emerald-800 bg-emerald-950/30 p-5">
            <p className="text-sm font-medium text-emerald-100">Racing Practice</p>
            <p className="mt-1 text-sm text-emerald-200/80">
              Select your boat and course, then start your own countdown.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-emerald-100">
                Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-lg text-white"
              >
                {dbCourses.map((course) => {
                  const distance =
                    boatClass === "cruisers3"
                      ? course.displayed_distance_long_nm
                      : course.displayed_distance_short_nm;

                  return (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.family_name} {course.course_number}
                      {distance != null ? ` (${distance.toFixed(1)} nm)` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-4 text-sm text-emerald-100">
              <p>
                Boat{" "}
                <span className="font-semibold text-white">
                  {selectedBoat?.display_name ?? "No boat selected"}
                </span>
              </p>
              <p className="mt-1">
                Class{" "}
                <span className="font-semibold text-white">
                  {selectedBoat ? selectedBoatClassLabel : "--"}
                </span>
              </p>
            </div>

            {selectedDbCourse ? (
              <div className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-4 text-sm text-emerald-100">
                <p>
                  Selected:{" "}
                  <span className="font-semibold text-white">
                    {selectedDbCourse.code}
                  </span>
                </p>
                <p>
                  Raw:{" "}
                  <span className="text-zinc-400">
                    {selectedDbCourse.raw_sequence}
                  </span>
                </p>
              </div>
            ) : null}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-emerald-100">
                Boat
              </label>
              <select
                value={selectedBoatId ?? ""}
                onChange={(e) => {
                  const boat = boats.find((item) => item.id === e.target.value) ?? null;
                  setSelectedBoat(boat?.id ?? null, boat?.display_name ?? null);
                  if (boat) {
                    setBoatClass(boat.boat_class === "cruisers4" ? "cruisers4" : "cruisers3");
                  }
                }}
                className="w-full rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-lg text-white"
              >
                <option value="">Select a boat</option>
                {boats.map((boat) => (
                  <option key={boat.id} value={boat.id}>
                    {boat.display_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleStartManualMode}
              disabled={!selectedCourse || !selectedBoatId}
              className="mt-5 h-16 w-full rounded-2xl bg-emerald-500 text-xl font-bold text-white disabled:opacity-50"
            >
              Start Timer
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
