/*
  Talks to the account API (api/auth/*). The session lives in an HttpOnly
  cookie the browser sends by itself; this code never sees or stores it.
*/

export interface Account {
  id: string
  username: string
  email: string
}

export interface AuthError {
  /** One line for the whole form. */
  error: string
  /** Per-field messages, e.g. { username: "That username is taken." } */
  fields: Record<string, string>
  /** Right password, but the email isn't confirmed yet. */
  unverified?: boolean
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api/auth/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    })
  } catch {
    throw { error: 'Couldn’t reach TomoNook. Check your internet and try again.', fields: {} } satisfies AuthError
  }
  const data = (await res.json().catch(() => ({}))) as Partial<AuthError> & T
  if (!res.ok) {
    throw {
      error: data.error ?? 'Something went wrong. Please try again.',
      fields: data.fields ?? {},
      unverified: data.unverified,
    } satisfies AuthError
  }
  return data
}

/** Who's signed in on this browser, or null. */
export async function fetchAccount(): Promise<Account | null> {
  try {
    return (await call<{ user: Account }>('me')).user
  } catch {
    return null
  }
}

export const logIn = (username: string, password: string) =>
  call<{ user: Account }>('login', { username, password }).then((d) => d.user)

export const signUp = (form: {
  email: string
  username: string
  password: string
  retypePassword: string
  acceptTerms: boolean
}) => call<{ message: string }>('signup', form).then((d) => d.message)

/** Opened from the "confirm your email" link; signs in on success. */
export const verifyEmail = (token: string) => call<{ user: Account }>('verify', { token }).then((d) => d.user)

/** Sends the "confirm your email" link again. Needs the password, so only the account's owner can ask. */
export const resendVerification = (username: string, password: string) =>
  call<{ message: string }>('resend', { username, password }).then((d) => d.message)

export const logOut = () => call('logout', {})

/** Asks for a reset link by email. Resolves with the message to show (the same whether or not the email has an account). */
export const requestReset = (email: string) => call<{ message: string }>('forgot', { email }).then((d) => d.message)

/** Sets a new password from an emailed link; signs in on success. */
export const resetPassword = (token: string, password: string, retypePassword: string) =>
  call<{ user: Account }>('reset', { token, password, retypePassword }).then((d) => d.user)
