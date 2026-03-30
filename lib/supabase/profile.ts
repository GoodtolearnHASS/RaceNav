import { supabase } from "./client";

export type ProfileRow = {
  id: string;
  display_name: string | null;
  boat_name: string | null;
};

export async function getMyProfile(): Promise<ProfileRow | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, boat_name")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data as ProfileRow;
}

export async function updateMyProfile(updates: {
  display_name?: string | null;
  boat_name?: string | null;
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

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload)
    .select("id, display_name, boat_name")
    .single();

  if (error) throw error;
  return data as ProfileRow;
}