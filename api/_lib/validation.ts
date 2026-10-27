import { z } from "zod";

/*
  What the login and sign-up forms may send. Anything else is rejected
  before it gets near the database. Unknown fields are dropped (z.object
  strips them), and every string has a maximum length.
*/

/** Bump when the terms change, so we know which version each user agreed to. */
export const TERMS_VERSION = "2026-10-27";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
/** Long enough for passphrases; capped so hashing can't be used to tie up the server. */
export const PASSWORD_MAX = 128;

const username = z
  .string()
  .trim()
  .min(USERNAME_MIN, `Usernames are at least ${USERNAME_MIN} characters.`)
  .max(USERNAME_MAX, `Usernames are at most ${USERNAME_MAX} characters.`)
  .regex(/^[A-Za-z0-9_]+$/, "Use only letters, numbers and _ in your username.");

const password = z
  .string()
  .min(PASSWORD_MIN, `Passwords are at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Passwords are at most ${PASSWORD_MAX} characters.`);

export const signupSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, "That email is too long.")
      .pipe(z.email("Enter a valid email address.")),
    username,
    password,
    retypePassword: z.string().max(PASSWORD_MAX),
    acceptTerms: z.literal(true, "Please agree to the terms and conditions."),
  })
  // `when`: still checked while other fields have errors, so every problem shows at once.
  .refine((d) => d.password === d.retypePassword, {
    path: ["retypePassword"],
    message: "The passwords don’t match.",
    when: ({ value }) => bothStrings(value, "password", "retypePassword"),
  })
  .refine((d) => d.password.toLowerCase() !== d.username.trim().toLowerCase(), {
    path: ["password"],
    message: "Your password can’t be your username.",
    when: ({ value }) => bothStrings(value, "password", "username"),
  });

function bothStrings(value: unknown, a: string, b: string) {
  const v = value as Record<string, unknown> | null;
  return typeof v?.[a] === "string" && typeof v?.[b] === "string";
}

/* Login only checks the shape: the real check is the password hash. */
export const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username.").max(USERNAME_MAX),
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX),
});

/** First message per field, e.g. { email: "Enter a valid email address." } */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    out[field] ??= issue.message;
  }
  return out;
}
