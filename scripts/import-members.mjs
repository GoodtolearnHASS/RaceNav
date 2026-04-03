import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function loadMembers() {
  const { data, error } = await supabase
    .from("import_member_accounts")
    .select("display_name, first_name, surname, normalized_boat_name, email, initial_password")
    .order("surname", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function loadBoatMap() {
  const { data, error } = await supabase
    .from("boats")
    .select("id, normalized_name");

  if (error) throw error;

  return new Map((data ?? []).map((boat) => [boat.normalized_name, boat.id]));
}

async function ensureAuthUser(member) {
  const existing = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (existing.error) throw existing.error;

  const matchedUser = existing.data.users.find(
    (user) => user.email?.toLowerCase() === member.email.toLowerCase()
  );

  if (matchedUser) return matchedUser;

  const created = await supabase.auth.admin.createUser({
    email: member.email,
    password: member.initial_password,
    email_confirm: true,
  });

  if (created.error) throw created.error;
  return created.data.user;
}

async function upsertProfile(userId, member, defaultBoatId) {
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: member.display_name,
    default_boat_id: defaultBoatId,
  });

  if (error) throw error;
}

async function main() {
  const members = await loadMembers();
  const boatMap = await loadBoatMap();

  console.log(`Preparing ${members.length} member accounts...`);

  for (const member of members) {
    const defaultBoatId = boatMap.get(member.normalized_boat_name) ?? null;
    const user = await ensureAuthUser(member);
    await upsertProfile(user.id, member, defaultBoatId);
    console.log(`Processed ${member.email} -> ${member.display_name}`);
  }

  console.log("Member import complete.");
}

main().catch((error) => {
  console.error("Member import failed:", error);
  process.exit(1);
});
