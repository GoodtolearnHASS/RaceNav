"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AuthStatus from "@/components/AuthStatus";
import { useRaceStore } from "@/lib/store/raceStore";
import { getSession } from "@/lib/supabase/session";
import { signInWithEmail } from "@/lib/supabase/auth";
import { getMyProfile } from "@/lib/supabase/profile";
import { fetchBoatById, fetchBoats, type BoatRow } from "@/lib/supabase/results";

const RACE_OFFICER_EMAILS = new Set([
  "raceofficer@hsbc.ie",
  "raceofficer2@hsbc.ie",
  "john@jonix.ie",
]);

export default function HomePage() {
  const router = useRouter();
  const startRace = useRaceStore((state) => state.startRace);
  const boatClass = useRaceStore((state) => state.boatClass);
  const setBoatClass = useRaceStore((state) => state.setBoatClass);
  const selectedBoatId = useRaceStore((state) => state.selectedBoatId);
  const setSelectedBoat = useRaceStore((state) => state.setSelectedBoat);
  const setRaceSessionId = useRaceStore((state) => state.setRaceSessionId);

  const [mounted, setMounted] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boats, setBoats] = useState<BoatRow[]>([]);
  const [selectedBoat, setSelectedBoatState] = useState<BoatRow | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [preferredBoatNameValue, setPreferredBoatNameValue] = useState("");
  const [showBoatPicker, setShowBoatPicker] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await getSession();
        setIsSignedIn(!!session);
        setCurrentEmail(session?.user.email?.toLowerCase() ?? null);
      } catch (err) {
        console.error(err);
        setIsSignedIn(false);
        setCurrentEmail(null);
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

        const profile = await getMyProfile();

        setDisplayName(profile?.display_name ?? "");

        const preferredBoat =
          profile?.default_boat_id != null
            ? await fetchBoatById(profile.default_boat_id)
            : null;

        setPreferredBoatNameValue(preferredBoat?.display_name ?? "");

        if (!selectedBoatId) {
          if (preferredBoat) {
            setSelectedBoat(preferredBoat.id, preferredBoat.display_name);
            setSelectedBoatState(preferredBoat);
            setBoatClass(
              preferredBoat.boat_class === "cruisers4" ? "cruisers4" : "cruisers3"
            );
            setShowBoatPicker(false);
          } else {
            setShowBoatPicker(true);
          }
        } else {
          const activeBoat = await fetchBoatById(selectedBoatId);
          setSelectedBoatState(activeBoat);
          setShowBoatPicker(false);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load home page data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isSignedIn, selectedBoatId, setBoatClass, setSelectedBoat]);

  useEffect(() => {
    if (!showBoatPicker || boats.length > 0) return;

    async function loadBoats() {
      try {
        const boatRows = await fetchBoats();
        setBoats(boatRows);
      } catch (err) {
        console.error(err);
        setError("Failed to load boats.");
      }
    }

    void loadBoats();
  }, [boats.length, showBoatPicker]);

  async function handleLogin() {
    try {
      setLoginBusy(true);
      setLoginError(null);

      await signInWithEmail(email, password);
      setIsSignedIn(true);
      setCurrentEmail(email.toLowerCase());
    } catch (err) {
      console.error(err);
      setLoginError("Sign in failed.");
    } finally {
      setLoginBusy(false);
    }
  }

  if (!mounted || checkingAuth) {
    return (
      <main className="min-h-screen bg-black p-4 text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <div className="flex items-center gap-4">
            <Image
              src="/HSBC.png"
              alt="HSBC Race Nav logo"
              width={43}
              height={52}
              className="rounded-2xl"
            />
            <h1 className="text-4xl font-bold tracking-tight">HSBC Race Nav</h1>
          </div>
          <p className="mt-3 text-zinc-300">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-black p-4 text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <div className="flex items-center gap-4">
            <Image
              src="/HSBC.png"
              alt="HSBC Race Nav logo"
              width={43}
              height={52}
              className="rounded-2xl"
            />
            <h1 className="text-4xl font-bold tracking-tight">HSBC Race Nav</h1>
          </div>
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

  function handleJoinRaceMode() {
    router.push("/race-mode");
  }

  function handleOpenManualMode() {
    router.push("/manual");
  }

function handleOpenRaceOfficer() {
    router.push("/race-officer");
  }

  function handleOpenProfile() {
    router.push("/profile");
  }

  const isRaceOfficerUser =
    currentEmail != null && RACE_OFFICER_EMAILS.has(currentEmail);
  const selectedBoatClassLabel =
    selectedBoat?.boat_class === "cruisers4" ? "Cruisers 4" : "Cruisers 3";

  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <div className="pt-6">
          <div className="flex items-center gap-4">
            <Image
              src="/HSBC.png"
              alt="HSBC Race Nav logo"
              width={47}
              height={56}
              className="rounded-2xl"
            />
            <h1 className="text-4xl font-bold tracking-tight">HSBC Race Nav</h1>
          </div>
          <p className="mt-3 text-zinc-300">Choose how you want to race.</p>
        </div>

        {isRaceOfficerUser ? (
          <section className="mt-4 rounded-3xl border border-amber-800 bg-amber-950/30 p-5">
            <p className="text-sm font-medium text-amber-100">Race Officer</p>
            <p className="mt-1 text-sm text-amber-200/80">
              Open the control screen to publish and manage the live race.
            </p>

            <button
              onClick={handleOpenRaceOfficer}
              className="mt-5 h-16 w-full rounded-2xl bg-amber-400 text-xl font-bold text-black"
            >
              Open Race Officer
            </button>
          </section>
        ) : null}

            <section className="mt-6 rounded-3xl border border-sky-800 bg-sky-950/30 p-5">
              <p className="text-sm font-medium text-sky-100">Race Mode</p>
              <p className="mt-1 text-sm text-sky-200/80">
                Join the live race published by the race officer.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-full border border-sky-700 bg-sky-950/40 px-3 py-1.5 text-sm text-sky-100">
                  {displayName || "No name set"}
                </div>
                <div className="rounded-full border border-sky-700 bg-sky-950/40 px-3 py-1.5 text-sm text-sky-100">
                  {selectedBoat?.display_name ?? "No boat selected"}
                </div>
                <button
                  onClick={() => setShowBoatPicker((current) => !current)}
                  className="rounded-full border border-sky-700 bg-sky-950/40 px-3 py-1.5 text-sm font-medium text-sky-100"
                >
                  {showBoatPicker ? "Done" : selectedBoat ? "Change Boat" : "Choose Boat"}
                </button>
              </div>

              {showBoatPicker ? (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-sky-100">
                    Boat
                  </label>
                  <select
                    value={selectedBoatId ?? ""}
                    onChange={(e) => {
                      const boat = boats.find((item) => item.id === e.target.value) ?? null;
                      setSelectedBoat(boat?.id ?? null, boat?.display_name ?? null);
                      if (boat) {
                        setBoatClass(
                          boat.boat_class === "cruisers4" ? "cruisers4" : "cruisers3"
                        );
                        setShowBoatPicker(false);
                      }
                    }}
                    className="w-full rounded-xl border border-sky-800 bg-sky-950/40 p-4 text-lg text-white"
                  >
                    <option value="">Select a boat</option>
                    {boats.map((boat) => (
                      <option key={boat.id} value={boat.id}>
                        {boat.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <button
                onClick={handleJoinRaceMode}
                disabled={!selectedBoatId}
                className="mt-5 h-16 w-full rounded-2xl bg-sky-500 text-xl font-bold text-white disabled:opacity-50"
              >
                Join Race Mode
              </button>
            </section>


	   
       


        {loading ? (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-zinc-300">Loading home page...</p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-800 bg-zinc-950 p-4">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <div className="mt-8 space-y-6 pb-8">
            <section className="rounded-3xl border border-emerald-800 bg-emerald-950/30 p-5">
              <p className="text-sm font-medium text-emerald-100">Racing Practice</p>
              <p className="mt-1 text-sm text-emerald-200/80">
                Open practice mode when you want to race outside the live session.
              </p>

              <button
                onClick={handleOpenManualMode}
                className="mt-5 h-16 w-full rounded-2xl bg-emerald-500 text-xl font-bold text-white disabled:opacity-50"
              >
                Racing Practice
              </button>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center justify-between gap-3">
                <AuthStatus compact />
                <button
                  onClick={handleOpenProfile}
                  className="shrink-0 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Profile
                </button>
              </div>
              {(displayName || selectedBoat || preferredBoatNameValue) ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
                  {displayName ? (
                    <div className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200">
                      {displayName}
                    </div>
                  ) : null}

                  {selectedBoat?.display_name ? (
                    <div className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200">
                      {selectedBoat.display_name}
                    </div>
                  ) : preferredBoatNameValue ? (
                    <div className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200">
                      {preferredBoatNameValue}
                    </div>
                  ) : null}
                  {selectedBoat ? (
                    <div className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200">
                      {selectedBoatClassLabel}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

          </div>
        )}
      </div>
    </main>
  );
}
