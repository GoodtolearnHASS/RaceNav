import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const TARGET_EMAILS = [
  "raceofficer@hsbc.ie",
  "raceofficer2@hsbc.ie",
];

const NEW_PASSWORD = "HSBCRO";

async function findUserByEmail(email) {
  const response = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (response.error) throw response.error;

  return (
    response.data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    ) ?? null
  );
}

async function main() {
  for (const email of TARGET_EMAILS) {
    const user = await findUserByEmail(email);

    if (!user) {
      console.log(`Skipped ${email}: user not found.`);
      continue;
    }

    const updated = await supabase.auth.admin.updateUserById(user.id, {
      password: NEW_PASSWORD,
      email_confirm: true,
    });

    if (updated.error) throw updated.error;

    console.log(`Updated password for ${email}`);
  }

  console.log("Race officer password reset complete.");
}

main().catch((error) => {
  console.error("Password reset failed:", error);
  process.exit(1);
});
