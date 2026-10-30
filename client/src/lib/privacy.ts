// TomoNook Privacy Policy. Shown from the sign-up window and Settings.
// It describes what the app really does; keep it in step with the code (api/, lib/sync.ts, lib/weather.ts).
// Update TERMS_VERSION in api/_lib/validation.ts when this changes.

import type { TermsBlock } from './terms.ts'

export const PRIVACY: TermsBlock[] = [
  ['p', 'Last updated: Oct 30, 2026'],
  ['h2', '1. Who We Are'],
  [
    'p',
    'TomoNook (https://tomonook.vercel.app/) is a free productivity website owned and operated by Martonie Ayaay ("we," "us," or "our"). This Privacy Policy explains what personal information we collect when you use TomoNook, why, who else handles it, how long we keep it, and the choices and rights you have. It forms part of our Terms and Conditions.',
  ],
  [
    'p',
    'We handle personal information in line with the Data Privacy Act of 2012 (Republic Act No. 10173) and its implementing rules.',
  ],
  ['h2', '2. What We Collect'],
  ['h3', 'Your account'],
  [
    'ul',
    [
      'Your email address and username.',
      'Your password. We never store it as you typed it: only a one-way scrambled form (an Argon2id hash) is kept, so not even we can read it.',
      'The date you agreed to our Terms and this Privacy Policy, that you confirmed you are at least 13, and when you confirmed your email address.',
    ],
  ],
  ['h3', 'What you put in TomoNook'],
  [
    'ul',
    [
      'Your profile: the name, age, gender, pronouns and other details you choose to add, and your avatar.',
      'Your tasks, categories, moods, mood diary entries, timers, stopwatch history and settings.',
      'Pictures you add for foods, and an alarm sound if you upload one.',
      'The city you pick for the weather card.',
    ],
  ],
  [
    'p',
    'Your mood diary is yours to write in, and it may include personal or sensitive things about how you feel. We use it only to show it back to you. Please think about what you share, especially on a shared device.',
  ],
  ['h3', 'Technical information'],
  [
    'ul',
    [
      'A login cookie that keeps you signed in (see section 5).',
      'Your IP address, when you log in, sign up or ask for a password reset. We use it only to block people who try to guess passwords or send too many emails, and we delete these records after one day.',
      'Our hosting provider keeps short-lived server logs (such as IP addresses and the pages requested) to run and protect the website.',
    ],
  ],
  [
    'p',
    'We do not use advertising, analytics or tracking tools, and we do not collect your location. The weather card uses only the city you pick.',
  ],
  ['h2', '3. Why We Use It'],
  [
    'ul',
    [
      'To create and run your account, log you in, and keep your data so it is there on any device you use.',
      'To send you emails you need: confirming your email address, resetting your password, or telling you someone tried to sign up with your email. We do not send newsletters or marketing.',
      'To keep TomoNook and your account secure, for example by limiting password guesses.',
      'To show the weather for the city you chose.',
    ],
  ],
  [
    'p',
    'We process your information because you asked us to provide the Service when you signed up (our agreement with you), with your consent, and for our legitimate interest in keeping the Service secure. We never sell your personal information or share it for advertising.',
  ],
  ['h2', '4. Who Else Handles It'],
  ['p', 'TomoNook relies on a few providers to run. They handle your information only to provide their service to us:'],
  [
    'ul',
    [
      'Vercel: hosts the website and runs its server code.',
      'Neon: the database where your account and your TomoNook data are stored.',
      'Google (Gmail): sends our emails to you.',
      'Google Fonts: your browser downloads the fonts TomoNook uses from Google, which can see your IP address.',
      'Open-Meteo: when you search for a city or view the weather, the city name or its map coordinates are sent to Open-Meteo. Nothing about your account is sent.',
    ],
  ],
  [
    'p',
    'These providers may store or process information on servers outside the Philippines. We may also share information if the law requires it, for example a valid court order.',
  ],
  ['h2', '5. Cookies and Browser Storage'],
  [
    'p',
    'TomoNook uses one cookie, which keeps you logged in. It is needed for the Service to work, cannot be read by the website’s own scripts, and lasts up to 30 days or until you log out.',
  ],
  [
    'p',
    'Your browser also keeps a copy of your TomoNook data so the app is quick. This copy is removed when you log out. If you use a shared device, please log out when you are done.',
  ],
  ['h2', '6. How Long We Keep It'],
  [
    'ul',
    [
      'Your account and TomoNook data: for as long as you have an account. When you delete your account in Settings, they are deleted right away and cannot be recovered.',
      'Sign-ups that are never confirmed: deleted after 24 hours.',
      'Password reset links: they stop working after 30 minutes. Email confirmation links: after 24 hours.',
      'Login sessions: up to 30 days. Records of login attempts: one day.',
      'Backup files you download are kept by you, not by us.',
    ],
  ],
  ['h2', '7. How We Protect It'],
  [
    'p',
    'Your connection to TomoNook is encrypted (HTTPS). Passwords are stored only as Argon2id hashes, login sessions and email links only as hashes, every request is checked before it reaches the database, and logins are rate limited. No system is perfectly secure, so we cannot promise your information will never be accessed without permission. If a breach affects you, we will tell you and the National Privacy Commission as the law requires.',
  ],
  ['h2', '8. Your Rights'],
  ['p', 'Under the Data Privacy Act, you have the right to:'],
  [
    'ul',
    [
      'Be informed about how your personal information is used (this policy).',
      'Access your information. Most of it is in the app, and Settings → Download backup gives you a copy of your TomoNook data.',
      'Correct it. You can edit your profile and data in the app, or ask us to correct your account details.',
      'Delete it. Settings → Delete account removes your account and everything in it.',
      'Object to processing, or withdraw your consent, by deleting your account or contacting us.',
      'Get a copy of your data in a format you can use (the backup file).',
      'Complain to the National Privacy Commission (privacy.gov.ph) if you think your rights were not respected.',
    ],
  ],
  ['h2', '9. Children'],
  [
    'p',
    'TomoNook is for people aged 13 and older. If you are under 18, please use TomoNook only with the involvement and consent of a parent or legal guardian. If we learn that someone under 13 has an account, we will delete it. Parents or guardians who believe their child under 13 has signed up can contact us.',
  ],
  ['h2', '10. Changes to This Policy'],
  [
    'p',
    'We may update this Privacy Policy. When we do, we will change the "Last updated" date above, and for significant changes we will make reasonable efforts to tell you, such as by email or a notice in TomoNook.',
  ],
  ['h2', '11. Contact Us'],
  ['p', 'For questions or requests about your personal information, please contact:'],
  ['p', 'Martonie Ayaay\nOwner and Operator, TomoNook\nEmail: martonieloreignayaay@gmail.com\nWebsite: https://tomonook.vercel.app/'],
]
