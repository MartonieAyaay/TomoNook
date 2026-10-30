import { createHash } from "node:crypto";

/*
  Turns away passwords that have shown up in data breaches: attackers try
  those first, whatever their length. Uses Have I Been Pwned's free
  "range" API: only the first 5 characters of the password's SHA-1 hash
  are sent, and the match is found here, so the password (and even its
  full hash) never leaves the server. Padding hides how many matches came back.

  If the service can't be reached in time, the password is allowed:
  signing up shouldn't depend on another website being up.
*/

export const BREACHED_MESSAGE = "This password has shown up in a data leak, so it’s easy to guess. Please choose another one.";

export type BreachCheck = (password: string) => Promise<boolean>;

/** Asks Have I Been Pwned whether the password is in a known breach. */
export async function pwnedPasswords(password: string, fetchFn: typeof fetch = fetch): Promise<boolean> {
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const res = await fetchFn(`https://api.pwnedpasswords.com/range/${sha1.slice(0, 5)}`, {
    headers: { "Add-Padding": "true", "User-Agent": "TomoNook" },
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok) throw new Error(`Pwned Passwords answered ${res.status}`);
  const suffix = sha1.slice(5);
  // Lines are "SUFFIX:COUNT"; padding lines have a count of 0.
  return (await res.text()).split("\n").some((line) => {
    const [s, count] = line.trim().split(":");
    return s === suffix && Number(count) > 0;
  });
}

let check: BreachCheck = pwnedPasswords;

/** Tests swap in a fake, so they don't call the real service. */
export function setBreachCheck(next: BreachCheck) {
  check = next;
}

/** Whether the password is known from a breach. False when it couldn't be checked. */
export async function isBreached(password: string) {
  try {
    return await check(password);
  } catch (e) {
    console.error("Couldn't check the password against known breaches:", e);
    return false;
  }
}
