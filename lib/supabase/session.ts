import { supabase } from "./client";

const SESSION_TIMEOUT_CODE = "SESSION_TIMEOUT";

export class SessionTimeoutError extends Error {
  code = SESSION_TIMEOUT_CODE;

  constructor() {
    super("Supabase session check timed out.");
    this.name = "SessionTimeoutError";
  }
}

export function isSessionTimeoutError(error: unknown): error is SessionTimeoutError {
  return (
    error instanceof SessionTimeoutError ||
    (error instanceof Error &&
      "code" in error &&
      error.code === SESSION_TIMEOUT_CODE)
  );
}

export async function getSession() {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const result = await Promise.race([
    supabase.auth.getSession(),
    new Promise<SessionTimeoutError>((resolve) => {
      timeoutId = setTimeout(() => resolve(new SessionTimeoutError()), 2500);
    }),
  ]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (result instanceof SessionTimeoutError) {
    throw result;
  }

  const { data, error } = result;
  if (error) throw error;
  return data.session;
}
