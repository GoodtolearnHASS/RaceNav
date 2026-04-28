import { supabase } from "./client";

export type ProfileRow = {
  id: string;
  display_name: string | null;
  default_boat_id: string | null;
  is_race_officer: boolean;
};

function normalizeProfileRow(data: {
  id: string;
  display_name: string | null;
  default_boat_id: string | null;
  is_race_officer?: boolean | null;
}): ProfileRow {
  return {
    id: data.id,
    display_name: data.display_name,
    default_boat_id: data.default_boat_id,
    is_race_officer: data.is_race_officer ?? false,
  };
}

export async function getMyProfile(): Promise<ProfileRow | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const profileQuery = async () =>
    supabase
      .from("profiles")
      .select("id, display_name, default_boat_id, is_race_officer")
      .eq("id", user.id)
      .single();

  let { data, error } = await profileQuery();

  // Allow the app to keep working until the database migration is applied.
  if (error?.code === "42703") {
    const fallback = await supabase
      .from("profiles")
      .select("id, display_name, default_boat_id")
      .eq("id", user.id)
      .single();

    data = fallback.data
      ? { ...fallback.data, is_race_officer: false }
      : null;
    error = fallback.error;
  }

  if (error) throw error;
  return data ? normalizeProfileRow(data) : null;
}

export async function updateMyProfile(updates: {
  display_name?: string | null;
  default_boat_id?: string | null;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Not signed in");

  const payload = {
    id: user.id,
    ...updates,
  };

  let { data, error } = await supabase
    .from("profiles")
    .upsert(payload)
    .select("id, display_name, default_boat_id, is_race_officer")
    .single();

  if (error?.code === "42703") {
    const fallback = await supabase
      .from("profiles")
      .upsert(payload)
      .select("id, display_name, default_boat_id")
      .single();

    data = fallback.data
      ? { ...fallback.data, is_race_officer: false }
      : null;
    error = fallback.error;
  }

  if (error) throw error;
  if (!data) throw new Error("Profile save returned no data");
  return normalizeProfileRow(data);
}
