"use client";

import Link from "next/link";

export default function HomeButton() {
  return (
    <Link
      href="/"
      className="inline-flex h-10 items-center rounded-full border border-zinc-700 bg-zinc-950 px-4 text-sm font-medium text-zinc-200 active:scale-[0.98]"
    >
      ← Home
    </Link>
  );
}