import { cookies } from "next/headers";

export const authCookieName = "sigeda_session";
export const authStateCookieName = "sigeda_auth_state";

export function getServerAuthToken() {
  return cookies().get(authCookieName)?.value ?? null;
}
