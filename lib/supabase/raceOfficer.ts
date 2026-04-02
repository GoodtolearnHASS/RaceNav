import { supabase } from "@/lib/supabase/client";

export type LiveRaceSession = {
  id: string;
  user_id: string;
  officer_user_id: string | null;
  course_id: string | null;
  course_code: string | null;
  boat_class: string;
  started_at: string;
  ended_at: string | null;
  active_leg_index: number;
  summary: Record<string, unknown> | null;
  created_at: string;
  mode: string;
  status: string;
  countdown_seconds: number | null;
  countdown_started_at: string | null;
  race_started_at: string | null;
  is_live: boolean;
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

export async function fetchLiveRaceSession(): Promise<LiveRaceSession | null> {
  const { data, error } = await supabase
    .from("race_sessions")
    .select("*")
    .eq("is_live", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw toReadableError("Load live race failed", error);

  return (data?.[0] ?? null) as LiveRaceSession | null;
}

export async function publishLiveRaceSession(input: {
  userId: string;
  courseId: string;
  courseCode: string;
  countdownSeconds: number;
}) {
  const existing = await fetchLiveRaceSession();

  if (existing) {
    const { data, error } = await supabase
      .from("race_sessions")
      .update({
        officer_user_id: input.userId,
        user_id: input.userId,
        course_id: input.courseId,
        course_code: input.courseCode,
        boat_class: "cruisers3",
        countdown_seconds: input.countdownSeconds,
        mode: "officer",
        status: "waiting",
        is_live: true,
        active_leg_index: 0,
        ended_at: null,
        countdown_started_at: null,
        race_started_at: null,
        started_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw toReadableError("Update live race failed", error);
    return data as LiveRaceSession;
  }

  const { data, error } = await supabase
    .from("race_sessions")
    .insert({
      officer_user_id: input.userId,
      user_id: input.userId,
      course_id: input.courseId,
      course_code: input.courseCode,
      boat_class: "cruisers3",
      started_at: new Date().toISOString(),
      active_leg_index: 0,
      mode: "officer",
      status: "waiting",
      countdown_seconds: input.countdownSeconds,
      is_live: true,
    })
    .select()
    .single();

  if (error) throw toReadableError("Insert live race failed", error);
  return data as LiveRaceSession;
}

export async function startLiveCountdown(
  sessionId: string,
  countdownSeconds: number
) {
  const countdownStartedAt = new Date();
  const raceStartedAt = new Date(
    countdownStartedAt.getTime() + countdownSeconds * 1000
  );

  const { data, error } = await supabase
    .from("race_sessions")
    .update({
      status: "countdown",
      countdown_started_at: countdownStartedAt.toISOString(),
      race_started_at: raceStartedAt.toISOString(),
      countdown_seconds: countdownSeconds,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw toReadableError("Start countdown failed", error);
  return data as LiveRaceSession;
}

export async function startLiveRaceNow(sessionId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("race_sessions")
    .update({
      status: "started",
      countdown_started_at: null,
      race_started_at: now,
      countdown_seconds: 0,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw toReadableError("Start race now failed", error);
  return data as LiveRaceSession;
}

export async function finishLiveRace(sessionId: string) {
  const { data, error } = await supabase
    .from("race_sessions")
    .update({
      status: "finished",
      ended_at: new Date().toISOString(),
      is_live: false,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw toReadableError("Finish race failed", error);
  return data as LiveRaceSession;
}

export async function abandonLiveRace(sessionId: string) {
  const { data, error } = await supabase
    .from("race_sessions")
    .update({
      status: "abandoned",
      ended_at: new Date().toISOString(),
      is_live: false,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw toReadableError("Abandon race failed", error);
  return data as LiveRaceSession;
}
