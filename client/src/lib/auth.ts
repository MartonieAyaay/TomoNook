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
  if (!res.ok) throw { error: data.error ?? 'Something went wrong. Please try again.', fields: data.fields ?? {} } satisfies AuthError
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
}) => call<{ user: Account }>('signup', form).then((d) => d.user)

export const logOut = () => call('logout', {})
