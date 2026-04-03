import { supabase } from "./client";

export type BoatRow = {
  id: string;
  display_name: string;
  normalized_name: string;
  skipper_owner: string | null;
  boat_class: string;
  sail_number: string | null;
  is_active: boolean;
};

export type RaceResultRow = {
  id: string;
  race_session_id: string;
  boat_id: string;
  operator_user_id: string | null;
  operator_name: string | null;
  started_at: string | null;
  finished_at: string | null;
  elapsed_seconds: number | null;
  status: string;
  source: string;
  notes: string | null;
};

function toReadableError(prefix: string, error: unknown) {
  if (error && typeof error === "object") {
    const e = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    return new Error(
      [
        prefix,
        e.message,
        e.details ? `Details: ${e.details}` : null,
        e.hint ? `Hint: ${e.hint}` : null,
        e.code ? `Code: ${e.code}` : null,
      ]
        .filter(Boolean)
        .join(" | ")
    );
  }

  return new Error(prefix);
}

export async function fetchBoats(): Promise<BoatRow[]> {
  const { data, error } = await supabase
    .from("boats")
    .select("id, display_name, normalized_name, skipper_owner, boat_class, sail_number, is_active")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) throw toReadableError("Load boats failed", error);
  return (data ?? []) as BoatRow[];
}

export async function fetchBoatById(boatId: string): Promise<BoatRow | null> {
  const { data, error } = await supabase
    .from("boats")
    .select("id, display_name, normalized_name, skipper_owner, boat_class, sail_number, is_active")
    .eq("id", boatId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw toReadableError("Load boat failed", error);
  return (data ?? null) as BoatRow | null;
}

export async function fetchRaceResultForBoat(
  raceSessionId: string,
  boatId: string
): Promise<RaceResultRow | null> {
  const { data, error } = await supabase
    .from("race_results")
    .select("*")
    .eq("race_session_id", raceSessionId)
    .eq("boat_id", boatId)
    .maybeSingle();

  if (error) throw toReadableError("Load existing race result failed", error);
  return (data ?? null) as RaceResultRow | null;
}

export async function saveRaceResult(input: {
  raceSessionId: string;
  boatId: string;
  startedAt: number;
  finishedAt: number;
  elapsedSeconds: number;
  status?: "finished" | "dnc" | "dns" | "dnf" | "retired";
  source?: "manual_end_button" | "auto_finish" | "officer_entry" | "admin_override";
  notes?: string | null;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw toReadableError("Load user failed", userError);
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const operatorName =
    (profile?.display_name as string | null | undefined) ?? user.email ?? null;

  const { data, error } = await supabase
    .from("race_results")
    .upsert(
      {
        race_session_id: input.raceSessionId,
        boat_id: input.boatId,
        operator_user_id: user.id,
        operator_name: operatorName,
        started_at: new Date(input.startedAt).toISOString(),
        finished_at: new Date(input.finishedAt).toISOString(),
        elapsed_seconds: input.elapsedSeconds,
        status: input.status ?? "finished",
        source: input.source ?? "manual_end_button",
        notes: input.notes ?? null,
      },
      {
        onConflict: "race_session_id,boat_id",
      }
    )
    .select()
    .single();

  if (error) throw toReadableError("Save race result failed", error);
  return data as RaceResultRow;
}
