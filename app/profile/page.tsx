"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import HomeButton from "@/components/HomeButton";
import { fetchBoats, type BoatRow } from "@/lib/supabase/results";
import { getMyProfile, updateMyProfile } from "@/lib/supabase/profile";
import { getSession } from "@/lib/supabase/session";

export default function ProfilePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [boats, setBoats] = useState<BoatRow[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [selectedBoatId, setSelectedBoatId] = useState("");

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

    async function loadProfilePage() {
      try {
        setLoading(true);
        setError(null);

        const [profile, boatRows] = await Promise.all([
          getMyProfile(),
          fetchBoats(),
        ]);

        setBoats(boatRows);
        setDisplayName(profile?.display_name ?? "");
        const preferredBoat = boatRows.find(
          (boat) => profile?.default_boat_id != null && boat.id === profile.default_boat_id
        );

        setSelectedBoatId(preferredBoat?.id ?? "");
      } catch (err) {
        console.error(err);
        setError("Failed to load your profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfilePage();
  }, [checkingAuth]);

  const selectedBoat = useMemo(
    () => boats.find((boat) => boat.id === selectedBoatId) ?? null,
    [boats, selectedBoatId]
  );

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      await updateMyProfile({
        display_name: displayName.trim() || null,
        default_boat_id: selectedBoat?.id ?? null,
      });

      setMessage("Profile saved.");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Failed to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto max-w-md pb-8 pt-4">
        <div className="flex items-center justify-between gap-3">
          <HomeButton />
        </div>

        <div className="mt-6">
          <h1 className="text-4xl font-bold tracking-tight">Profile</h1>
          <p className="mt-3 text-zinc-300">
            Set your name and your usual boat so race day starts with the right
            defaults.
          </p>
        </div>

        {checkingAuth || loading ? (
          <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-zinc-300">Loading profile...</p>
          </section>
        ) : (
          <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-white"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Default Boat
              </label>
              <select
                value={selectedBoatId}
                onChange={(e) => setSelectedBoatId(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-white"
              >
                <option value="">No default boat</option>
                {boats.map((boat) => (
                  <option key={boat.id} value={boat.id}>
                    {boat.display_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedBoat ? (
              <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-300">
                <p>
                  Owner:{" "}
                  <span className="font-semibold text-white">
                    {selectedBoat.skipper_owner ?? "--"}
                  </span>
                </p>
                <p className="mt-1">
                  Class:{" "}
                  <span className="font-semibold text-white">
                    {selectedBoat.boat_class === "cruisers4"
                      ? "Cruisers 4"
                      : "Cruisers 3"}
                  </span>
                </p>
              </div>
            ) : null}

            {error ? <p className="mt-5 text-red-400">{error}</p> : null}
            {message ? <p className="mt-5 text-emerald-400">{message}</p> : null}

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-6 h-14 w-full rounded-2xl bg-blue-500 text-lg font-bold text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
