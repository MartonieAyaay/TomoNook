// One quote a day, in order, starting over when the list runs out.
const QUOTES = [
  'Small steps every day add up to big things.',
  'You don’t have to be perfect to be amazing.',
  'Rest is part of the work.',
  'Be gentle with yourself. You’re doing your best.',
  'Progress, not perfection.',
  'One task at a time. You’ve got this.',
  'Little by little, a little becomes a lot.',
  'Your pace is still progress.',
  'Bloom where you are planted.',
  'It’s okay to take a break and breathe.',
  'Done is better than perfect.',
  'Today is a good day to try again.',
  'Grow through what you go through.',
  'Every tomato starts as a tiny seed.',
  'Be proud of how far you’ve come.',
  'Focus on what you can do today.',
  'Kindness to yourself counts too.',
  'Slow progress is still progress.',
  'You are allowed to start over.',
  'Drink some water and keep going!',
  'Celebrate the small wins.',
  'Your future self will thank you.',
  'Keep going, you’re closer than you think.',
  'Make today a little bit sweeter.',
  'Believe in the work you’re doing.',
  'Feelings are visitors. Let them come and go.',
  'Start where you are. Use what you have.',
  'A calm mind grows good ideas.',
  'You can do hard things.',
  'Stay ripe, stay kind.',
]

export function quoteOfTheDay(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  return QUOTES[day % QUOTES.length]
}
