import { cookies } from "next/headers";

export const authCookieName = "sigeda_session";

export function getServerAuthToken() {
  return cookies().get(authCookieName)?.value ?? null;
}
