"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "@/lib/supabase/auth";
import { getSession } from "@/lib/supabase/session";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await getSession();
        if (session) {
          router.replace("/");
          return;
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [router]);

  async function handleSubmit() {
    try {
      setBusy(true);
      setError(null);

      await signInWithEmail(email, password);
      router.replace("/");
    } catch (err) {
      console.error(err);
      setError("Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-black text-white p-4">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <h1 className="text-4xl font-bold tracking-tight">Race Nav</h1>
          <p className="mt-3 text-zinc-300">Checking sign-in...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
        <h1 className="text-4xl font-bold tracking-tight">Race Nav</h1>
        <p className="mt-3 text-zinc-300">Sign in to continue.</p>

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
            onClick={handleSubmit}
            disabled={busy || !email || !password}
            className="w-full rounded-2xl bg-blue-500 p-5 text-xl font-bold text-white disabled:opacity-50"
          >
            {busy ? "Please wait..." : "Sign In"}
          </button>

          {error && <p className="text-red-400">{error}</p>}
        </div>
      </div>
    </main>
  );
}