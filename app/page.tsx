"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthStatus from "@/components/AuthStatus";
import type { BoatClass } from "@/lib/navigation/types";
import type { DbCourse, DbCourseLeg, DbMark } from "@/lib/navigation/dbTypes";
import { fetchCourseLegs, fetchCourses, fetchMarks } from "@/lib/supabase/queries";
import { mapDbCourseToCourse, mapDbMarkToMark } from "@/lib/navigation/mappers";
import { useRaceStore } from "@/lib/store/raceStore";
import { getSession } from "@/lib/supabase/session";
import { signInWithEmail } from "@/lib/supabase/auth";
import { getMyProfile, updateMyProfile } from "@/lib/supabase/profile";

export default function HomePage() {
  const router = useRouter();
  const startRace = useRaceStore((state) => state.startRace);

  const [mounted, setMounted] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dbCourses, setDbCourses] = useState<DbCourse[]>([]);
  const [dbCourseLegs, setDbCourseLegs] = useState<DbCourseLeg[]>([]);
  const [dbMarks, setDbMarks] = useState<DbMark[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [boatClass, setBoatClass] = useState<BoatClass>("cruisers2");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [boatName, setBoatName] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await getSession();
        setIsSignedIn(!!session);
      } catch (err) {
        console.error(err);
        setIsSignedIn(false);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [courses, courseLegs, marks, profile] = await Promise.all([
          fetchCourses(),
          fetchCourseLegs(),
          fetchMarks(),
          getMyProfile(),
        ]);

        setDbCourses(courses);
        setDbCourseLegs(courseLegs);
        setDbMarks(marks);

        if (courses.length > 0) {
          setSelectedCourseId(courses[0].id);
        }

        setDisplayName(profile?.display_name ?? "");
        setBoatName(profile?.boat_name ?? "");
      } catch (err) {
        console.error(err);
        setError("Failed to load courses from Supabase.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isSignedIn]);

  async function handleLogin() {
    try {
      setLoginBusy(true);
      setLoginError(null);

      await signInWithEmail(email, password);
      setIsSignedIn(true);
    } catch (err) {
      console.error(err);
      setLoginError("Sign in failed.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleSaveProfile() {
    try {
      setProfileBusy(true);
      setProfileMessage(null);

      await updateMyProfile({
        display_name: displayName || null,
        boat_name: boatName || null,
      });

      setProfileMessage("Profile saved.");
    } catch (err) {
      console.error(err);
      setProfileMessage("Failed to save profile.");
    } finally {
      setProfileBusy(false);
    }
  }

  if (!mounted || checkingAuth) {
    return (
      <main className="min-h-screen bg-black text-white p-4">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight">Race Nav</h1>
          <p className="mt-3 text-zinc-300">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-black text-white p-4">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight">Race Nav</h1>
          <p className="mt-3 text-zinc-300">
            Sign in to select a course and start racing.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Contact the admin if you need an account.
          </p>

          <div className="mt-8 space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-white"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-white"
            />

            <button
              onClick={handleLogin}
              disabled={loginBusy || !email || !password}
              className="w-full rounded-2xl bg-blue-500 p-5 text-xl font-bold text-white disabled:opacity-50"
            >
              {loginBusy ? "Please wait..." : "Sign In"}
            </button>

            {loginError && <p className="text-red-400">{loginError}</p>}
          </div>
        </div>
      </main>
    );
  }

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

  function handleStartRace() {
    if (!selectedCourse) return;
    startRace(selectedCourse, boatClass, marks);
    router.push("/race");
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
        <h1 className="text-4xl font-bold tracking-tight">Race Nav</h1>
        <p className="mt-3 text-zinc-300">Select course and class to begin.</p>

        <div className="mt-4">
          <AuthStatus />
        </div>

        <div className="mt-4 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div>
            <p className="text-sm font-medium text-zinc-300">Profile</p>
            <p className="text-xs text-zinc-500">
              Boat details for race history and display.
            </p>
          </div>

          <input
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-white"
          />

          <input
            type="text"
            placeholder="Boat name"
            value={boatName}
            onChange={(e) => setBoatName(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-white"
          />

          <button
            onClick={handleSaveProfile}
            disabled={profileBusy}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-white disabled:opacity-50"
          >
            {profileBusy ? "Saving..." : "Save Profile"}
          </button>

          {profileMessage && (
            <p
              className={
                profileMessage === "Profile saved."
                  ? "text-green-400"
                  : "text-red-400"
              }
            >
              {profileMessage}
            </p>
          )}
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-zinc-300">Loading courses...</p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-800 bg-zinc-950 p-4">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
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
                {dbCourses.map((course) => {
                  const distance =
                    boatClass === "cruisers2"
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

            <div>
              <p className="mb-2 block text-sm font-medium text-zinc-300">
                Class
              </p>
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

            {selectedDbCourse && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
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
            )}

            <button
              onClick={handleStartRace}
              disabled={!selectedCourse}
              className="w-full rounded-2xl bg-blue-500 p-5 text-xl font-bold text-white disabled:opacity-50"
            >
              Start Race
            </button>
          </div>
        )}
      </div>
    </main>
  );
}