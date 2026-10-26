import type { Pronoun } from '../store/profileStore.ts'

/** Words that stand in for the user in a sentence about them. */
export interface Forms {
  they: string
  them: string
  their: string
  "they're": string
  "they've": string
}

const FORMS: Record<Pronoun, Forms> = {
  She: { they: 'she', them: 'her', their: 'her', "they're": "she's", "they've": "she's" },
  He: { they: 'he', them: 'him', their: 'his', "they're": "he's", "they've": "he's" },
  They: { they: 'they', them: 'them', their: 'their', "they're": "they're", "they've": "they've" },
  It: { they: 'it', them: 'it', their: 'its', "they're": "it's", "they've": "it's" },
}

const PAIRS: Record<Pronoun, string> = { She: 'she/her', He: 'he/him', They: 'they/them', It: 'it/its' }

/** The little tag under the name: "she/her" for one, "she/they" for several. */
export function pronounTag(pronouns: Pronoun[]) {
  if (pronouns.length === 0) return ''
  if (pronouns.length === 1) return PAIRS[pronouns[0]]
  return pronouns.map((p) => p.toLowerCase()).join('/')
}

/** Forms for one sentence: a random pick of the user's pronouns, or their name if they chose none. */
export function pickForms(pronouns: Pronoun[], name: string): Forms {
  if (pronouns.length > 0) return FORMS[pronouns[Math.floor(Math.random() * pronouns.length)]]
  return { they: name, them: name, their: `${name}'s`, "they're": `${name}'s`, "they've": `${name}'s` }
}

/**
  Fills {name}, {they}, {them}, {their}, {they're} and {they've} in a line.
  A capitalized token ({Name}, {They're}) capitalizes what it's replaced with.
*/
export function fill(line: string, name: string, forms: Forms) {
  return line.replace(/\{([^}]+)\}/g, (token, key: string) => {
    const lower = key.toLowerCase()
    const word = lower === 'name' ? name : forms[lower as keyof Forms]
    if (word === undefined) return token
    return key[0] === key[0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word
  })
}
