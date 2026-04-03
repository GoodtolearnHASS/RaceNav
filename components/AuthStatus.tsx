"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/supabase/auth";

export default function AuthStatus({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser();
        setEmail(user?.email ?? null);
      } catch (error) {
        console.error(error);
      }
    }

    loadUser();
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
      setEmail(null);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(error);
    }
  }

  if (!email) {
    return <p className="text-sm text-zinc-400">Not signed in</p>;
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-zinc-300">{email}</p>
        <button
          onClick={handleSignOut}
          className="shrink-0 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-white"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-sm text-zinc-300">{email}</p>
      <button
        onClick={handleSignOut}
        className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-white"
      >
        Sign Out
      </button>
    </div>
  );
}
