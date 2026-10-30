# TomoNook 🍅

A cozy, tomato-themed productivity app. Plan your day, track your mood, focus with timers, and look after a little tomato friend who reacts to how you're doing.

## Features

- **Dashboard** – today's tasks, mood, timers and weather at a glance.
- **To-do list** – tasks with categories and High / Medium / Low priorities (add, remove and reorder levels). Edit, delete and drag tasks; a tomato fills up as you finish them.
- **Mood tracker** – pick today's mood from up to 8 custom moods, write in a mood diary, and keep a mood streak going (miss a day and the tomato goes *splat*).
- **Timers** – a stopwatch with history, timer cards, and a pomodoro loop of lock-in and chill phases with a chime between them.
- **Avatar** – build your own tomato from layered, recolorable art: eyes, brows, nose, mouth, hair and more, each movable and resizable, with undo/redo and a color picker. Your avatar blinks, keeps you company in the corner, and reacts to what you do.
- **Profile** – an About me card, a Daily Quote, and a Feed button to give your tomato a cookie or foods you add with your own pictures.
- **Gossip tomatoes** – two tomatoes you name during setup. They move to a different tab every 4 hours and chat about you, in gibberish voices.
- **Weather** – today's weather for the city you pick (°F, °C or K), from [Open-Meteo](https://open-meteo.com/). No account or API key needed.
- **Accounts** – sign up (confirming your email), log in with your username or email, and everything you make is saved to your account, so it's there on any device. Change your password, log out other devices, or delete your account in Settings.
- **Terms and Privacy Policy** – agreed to at sign-up (13 or older), and readable any time from Settings.
- **Settings** – sound and volume, gossip tomato and avatar options, a gentle mode with no splats, reduced motion, text size, timer chime style, and backup / restore / reset of your data.

## Tech stack

| Part | What it uses |
|---|---|
| `client/` | React 19, TypeScript, Vite, React Router, Zustand, dnd-kit |
| `api/` | Account and data API: Vercel functions, PostgreSQL (`pg`), Argon2id, Zod |
| `server/` | Node, Express 5 for local development (runs the same `api/` code) |
| `shared/` | Types and date helpers used by both |

It's an npm workspaces monorepo. Accounts and each account's data (tasks, moods, avatar...) live in PostgreSQL. The browser keeps a copy for the signed-in account (`client/src/lib/storage.ts`), which `client/src/lib/sync.ts` sends to the account a moment after each change, matches to whoever signs in before the app loads, and removes on log out.

### Accounts and security

- Passwords are hashed with **Argon2id**; sessions are random tokens in an **HttpOnly, Secure, SameSite=Lax** cookie, stored only as hashes.
- New accounts **confirm their email** before they can log in. Signing up with an email that already has an account gives the same reply (its owner is emailed instead), so the form doesn't reveal who uses TomoNook.
- Passwords found in **data breaches** are refused ([Have I Been Pwned](https://haveibeenpwned.com/API/v3#PwnedPasswords); only 5 characters of the password's hash are sent).
- Every input is checked with **Zod**, and every query uses **parameters**.
- **Forgot password?** emails a one-time link that works for 30 minutes (stored only as a hash); resetting logs out every other device.
- Logins are **rate limited** (5 wrong passwords per account and IP, 20 per IP, per 15 minutes; 5 sign-ups per IP and 3 per email per hour).
- A **Content-Security-Policy** (`vercel.json`) only lets the page load scripts from TomoNook itself, and data from TomoNook and Open-Meteo.
- Expired sessions, links and unconfirmed sign-ups are cleaned up hourly.
- Secrets come from **environment variables** (see `.env.example`), never from the code.

## Getting started

You need [Node.js](https://nodejs.org/) 22 or newer.

```bash
git clone https://github.com/MartonieAyaay/TomoNook.git
cd TomoNook
npm install
npm run dev
```

Then open **http://localhost:5173** and sign up. Locally, emails aren't sent: the "confirm your email" link (and any password reset link) is printed in the terminal running `npm run dev`. Open it, and the first visit walks you through setting up your profile and naming the gossip tomatoes.

Locally you don't need a database: without `DATABASE_URL`, accounts are kept in a built-in Postgres (PGlite) in `server/data/`. To use a real one, copy `.env.example` to `.env` and set `DATABASE_URL`.

`npm run dev` starts both the client (port 5173) and the server (port 3001). To start only one:

```bash
npm run dev:client
npm run dev:server
```

## Deploying to Vercel

1. In your Vercel project, open **Storage** and add a **Neon** (Postgres) database. Vercel sets `DATABASE_URL` for you.
2. Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASS` under **Settings → Environment Variables** (see `.env.example`; a Gmail app password works). Sign-up needs them: it emails a link to confirm the address.
3. Deploy. The tables are created on the first request.

## Scripts

Run from the project root:

| Command | What it does |
|---|---|
| `npm run dev` | Client and server together, with live reload |
| `npm run build` | Type-checks and builds the client into `client/dist` |
| `npm run typecheck` | Type-checks every package |
| `npm test` | Runs the shared package's tests and the account API tests |

GitHub runs the type checks, tests and build on every pull request (`.github/workflows/ci.yml`).

## Project layout

```
client/src/
  pages/        One file per screen (Dashboard, To-do, Mood, Timers, Profile, Settings)
  components/   Avatar, gossip tomatoes, sidebar, city picker and more
  store/        Zustand stores, one per feature, saved to localStorage
  lib/          Weather, sounds, chime, gossip lines, storage helpers
  assets/       Hand-drawn art, icons and sound effects
api/            Account and data API (Vercel functions); the logic is in api/_lib
server/src/     Express server for local development (runs the same api/ code)
shared/src/     Shared types and date helpers
```

## Credits

- Weather data and city search by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0).
- Fonts from Google Fonts: Poetsen One, Lalezar, Khula, Patrick Hand, Podkova.
