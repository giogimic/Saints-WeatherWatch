/** Storm Expert Training — question banks for Play.
 * Categories match QuizAttempt schema: science | radar | safety | history
 */

export type QuizCategory = 'radar' | 'science' | 'safety' | 'history';

export interface QuizChoice {
  id: string;
  label: string;
  /** Short emoji / symbol for visual scanning */
  icon?: string;
}

export interface QuizQuestion {
  id: string;
  category: QuizCategory;
  prompt: string;
  /** Optional visual hint key rendered as SVG diagram */
  diagram?: 'hook' | 'couplet' | 'core' | 'watch' | 'warning' | 'ef0' | 'ef2' | 'ef4' | 'shelf';
  choices: QuizChoice[];
  correctId: string;
  /** Shown after answer — always encouraging */
  explainCorrect: string;
  explainWrong: string;
}

export interface QuizTrack {
  id: QuizCategory;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
  badge: string;
}

export const QUIZ_TRACKS: QuizTrack[] = [
  {
    id: 'radar',
    title: 'Radar Ace',
    subtitle: 'Read the screen like a chaser',
    icon: '📡',
    accent: 'primary',
    badge: 'Radar Ace',
  },
  {
    id: 'history',
    title: 'EF Ladder',
    subtitle: 'Match damage to tornado power',
    icon: '🌪️',
    accent: 'secondary',
    badge: 'Damage Analyst',
  },
  {
    id: 'safety',
    title: 'Field Safety',
    subtitle: 'Stay sharp when storms get close',
    icon: '🛡️',
    accent: 'accent',
    badge: 'Safety Lead',
  },
  {
    id: 'science',
    title: 'Storm Science',
    subtitle: 'Prove you know how storms work',
    icon: '⚡',
    accent: 'warning',
    badge: 'Storm Scientist',
  },
];

export const QUESTIONS: QuizQuestion[] = [
  // —— RADAR ——
  {
    id: 'rad-1',
    category: 'radar',
    prompt: 'You see a bright curved “hook” on radar. What is that often a hint of?',
    diagram: 'hook',
    choices: [
      { id: 'a', label: 'Just light rain', icon: '💧' },
      { id: 'b', label: 'Possible rotating storm', icon: '🌀' },
      { id: 'c', label: 'Clear sunny skies', icon: '☀️' },
    ],
    correctId: 'b',
    explainCorrect: 'Expert call. A hook echo can mean the storm is spinning — chasers watch those closely.',
    explainWrong: 'Close. That hook shape is a classic clue that the storm might be rotating. You’re learning the real language.',
  },
  {
    id: 'rad-2',
    category: 'radar',
    prompt: 'On velocity radar, red and green next to each other in a tight pair often means…',
    diagram: 'couplet',
    choices: [
      { id: 'a', label: 'Wind spinning (couplet)', icon: '🔄' },
      { id: 'b', label: 'No wind at all', icon: '😴' },
      { id: 'c', label: 'Only snow', icon: '❄️' },
    ],
    correctId: 'a',
    explainCorrect: 'That’s a velocity couplet — the same pattern pros hunt for. Strong read.',
    explainWrong: 'Good try. Red/green side-by-side can mean wind toward and away from the radar = spin. You’ve got the idea now.',
  },
  {
    id: 'rad-3',
    category: 'radar',
    prompt: 'Bright reds and pinks on reflectivity usually mean…',
    diagram: 'core',
    choices: [
      { id: 'a', label: 'Weak drizzle', icon: '🌦️' },
      { id: 'b', label: 'Stronger storm cores', icon: '🔴' },
      { id: 'c', label: 'The map is broken', icon: '🔧' },
    ],
    correctId: 'b',
    explainCorrect: 'Nailed it. Hot colors = heavier rain / hail cores. Classic radar skill.',
    explainWrong: 'Almost. Hotter colors usually mean stronger echoes — that’s where the punch is.',
  },
  {
    id: 'rad-4',
    category: 'radar',
    prompt: 'A storm is moving east. Where should a careful chaser NOT sit for long?',
    choices: [
      { id: 'a', label: 'West of the storm (safe buffer)', icon: '⬅️' },
      { id: 'b', label: 'Directly in the storm’s path', icon: '🎯' },
      { id: 'c', label: 'Far south with an exit road', icon: '🛣️' },
    ],
    correctId: 'b',
    explainCorrect: 'Chaser brain unlocked. You never park in the path — you watch from a safe angle.',
    explainWrong: 'Smart people ask this. Sitting in the path is the danger zone. Pros stay off to the side with an escape road.',
  },
  {
    id: 'rad-5',
    category: 'radar',
    prompt: 'What does radar mainly show you?',
    choices: [
      { id: 'a', label: 'Where rain and wind echoes are', icon: '🗺️' },
      { id: 'b', label: 'Tomorrow’s lottery numbers', icon: '🎱' },
      { id: 'c', label: 'Only temperature indoors', icon: '🌡️' },
    ],
    correctId: 'a',
    explainCorrect: 'Textbook. Radar is your storm map — you’re speaking fluent chase already.',
    explainWrong: 'Radar is the storm map: rain, hail cores, and motion clues. You’ve got that locked now.',
  },

  // —— EF / HISTORY (damage scale) ——
  {
    id: 'ef-1',
    category: 'history',
    prompt: 'Tornado ripped some shingles and snapped small branches. Likely rating?',
    diagram: 'ef0',
    choices: [
      { id: 'a', label: 'EF0 — light damage', icon: '1️⃣' },
      { id: 'b', label: 'EF4 — extreme', icon: '4️⃣' },
      { id: 'c', label: 'EF5 — strongest', icon: '5️⃣' },
    ],
    correctId: 'a',
    explainCorrect: 'Damage Analyst approved. Light roof / tree damage = EF0 range.',
    explainWrong: 'EF0 is the light end — shingles and small branches. You’re building the EF ladder in your head.',
  },
  {
    id: 'ef-2',
    category: 'history',
    prompt: 'Homes badly damaged, big trees snapped or uprooted. That points toward…',
    diagram: 'ef2',
    choices: [
      { id: 'a', label: 'EF0', icon: '1️⃣' },
      { id: 'b', label: 'EF2 — serious damage', icon: '2️⃣' },
      { id: 'c', label: 'Just a breeze', icon: '🍃' },
    ],
    correctId: 'b',
    explainCorrect: 'Yes. EF2 is “this got real.” You’re rating like a spotter.',
    explainWrong: 'When houses take serious hits and big trees go down, think EF2 territory. Strong catch-up.',
  },
  {
    id: 'ef-3',
    category: 'history',
    prompt: 'How do experts usually rate a tornado’s EF number?',
    choices: [
      { id: 'a', label: 'By how loud the thunder was', icon: '🔊' },
      { id: 'b', label: 'By the damage left behind', icon: '🏚️' },
      { id: 'c', label: 'By the color of the cloud', icon: '☁️' },
    ],
    correctId: 'b',
    explainCorrect: 'Exactly. EF is a damage scale — not a “how scary it looked” scale.',
    explainWrong: 'Pros rate by damage surveys, not cloud color. That’s the secret most beginners miss — and you just learned it.',
  },
  {
    id: 'ef-4',
    category: 'history',
    prompt: 'Well-built homes swept clean off foundations — which end of the scale?',
    diagram: 'ef4',
    choices: [
      { id: 'a', label: 'EF0–EF1', icon: '🟢' },
      { id: 'b', label: 'EF4–EF5 (extreme)', icon: '🟣' },
      { id: 'c', label: 'Not a tornado', icon: '❌' },
    ],
    correctId: 'b',
    explainCorrect: 'Brutal but correct. Top of the EF ladder. Respect that power.',
    explainWrong: 'That level of wipe-out sits at the top: EF4–EF5. Heavy knowledge unlocked.',
  },
  {
    id: 'ef-5',
    category: 'history',
    prompt: 'True or false: a skinny tornado is always weaker than a wide one.',
    choices: [
      { id: 'a', label: 'True — skinny = weak', icon: '📏' },
      { id: 'b', label: 'False — size ≠ power', icon: '🧠' },
      { id: 'c', label: 'Only if it’s white', icon: '⬜' },
    ],
    correctId: 'b',
    explainCorrect: 'Expert myth-bust. Size doesn’t equal EF — damage does.',
    explainWrong: 'Common myth. A skinny tornado can still pack a punch. Damage tells the truth.',
  },

  // —— SAFETY ——
  {
    id: 'saf-1',
    category: 'safety',
    prompt: 'A Tornado WATCH means…',
    diagram: 'watch',
    choices: [
      { id: 'a', label: 'Tornado is on the ground now', icon: '🚨' },
      { id: 'b', label: 'Conditions could support tornadoes', icon: '👀' },
      { id: 'c', label: 'All clear forever', icon: '✅' },
    ],
    correctId: 'b',
    explainCorrect: 'Watch = stay ready. You’re talking official NWS language.',
    explainWrong: 'Watch = “possible.” Warning = “happening / about to.” That difference is chaser gold.',
  },
  {
    id: 'saf-2',
    category: 'safety',
    prompt: 'A Tornado WARNING means…',
    diagram: 'warning',
    choices: [
      { id: 'a', label: 'Take shelter now — danger is real', icon: '🏠' },
      { id: 'b', label: 'Go outside for photos', icon: '📷' },
      { id: 'c', label: 'Ignore it', icon: '🙉' },
    ],
    correctId: 'a',
    explainCorrect: 'Safety Lead energy. Warning = act now, not later.',
    explainWrong: 'Warning is the loud alarm: get to sturdy shelter. Pros respect warnings every time.',
  },
  {
    id: 'saf-3',
    category: 'safety',
    prompt: 'Best place during a tornado warning at home?',
    choices: [
      { id: 'a', label: 'Interior room on lowest floor', icon: '🚪' },
      { id: 'b', label: 'Next to big windows', icon: '🪟' },
      { id: 'c', label: 'On the roof', icon: '🏠' },
    ],
    correctId: 'a',
    explainCorrect: 'Perfect. Low, center, away from glass — textbook safe call.',
    explainWrong: 'Lowest floor, inside walls, no windows. That’s the move. You’re locked in.',
  },
  {
    id: 'saf-4',
    category: 'safety',
    prompt: 'You’re chasing and roads flood ahead. What do you do?',
    choices: [
      { id: 'a', label: 'Drive through fast', icon: '🚗' },
      { id: 'b', label: 'Turn around — never flood roads', icon: '↩️' },
      { id: 'c', label: 'Stop in the middle of the water', icon: '🛑' },
    ],
    correctId: 'b',
    explainCorrect: 'Turn Around Don’t Drown — real chasers live by that.',
    explainWrong: 'Flood water hides deep spots. Pros bail and reroute. That’s not quitting — that’s skill.',
  },
  {
    id: 'saf-5',
    category: 'safety',
    prompt: 'Lightning is flashing nearby. Safest move outdoors?',
    choices: [
      { id: 'a', label: 'Stand under the tallest tree', icon: '🌳' },
      { id: 'b', label: 'Get in a hard-top vehicle or building', icon: '🚙' },
      { id: 'c', label: 'Hold up a metal pole', icon: '📐' },
    ],
    correctId: 'b',
    explainCorrect: 'Yes. Vehicle or building — not trees, not metal poles.',
    explainWrong: 'Hard-top car or solid building. Trees and metal are the opposite of safe.',
  },

  // —— SCIENCE ——
  {
    id: 'sci-1',
    category: 'science',
    prompt: 'Storms usually need warm moist air PLUS…',
    choices: [
      { id: 'a', label: 'Rising air and wind shear', icon: '⬆️' },
      { id: 'b', label: 'Only dry desert air', icon: '🏜️' },
      { id: 'c', label: 'Zero wind forever', icon: '🚫' },
    ],
    correctId: 'a',
    explainCorrect: 'Storm Scientist mode. Moisture + lift + shear — the big three.',
    explainWrong: 'Remember the trio: moisture, lift (rising air), and changing winds with height. You’ve got the recipe.',
  },
  {
    id: 'sci-2',
    category: 'science',
    prompt: '“Wind shear” means…',
    choices: [
      { id: 'a', label: 'Wind that changes speed/direction with height', icon: '🧭' },
      { id: 'b', label: 'No wind at all', icon: '😶' },
      { id: 'c', label: 'Only ocean waves', icon: '🌊' },
    ],
    correctId: 'a',
    explainCorrect: 'That’s the spin fuel. You’re using real meteorology words correctly.',
    explainWrong: 'Shear = winds changing as you go up. That’s what helps storms rotate.',
  },
  {
    id: 'sci-3',
    category: 'science',
    prompt: 'A supercell is…',
    choices: [
      { id: 'a', label: 'A long-lived rotating thunderstorm', icon: '🌀' },
      { id: 'b', label: 'A tiny puff of fog', icon: '🌫️' },
      { id: 'c', label: 'A type of sandwich', icon: '🥪' },
    ],
    correctId: 'a',
    explainCorrect: 'Supercell = the storm type chasers dream about. Correct.',
    explainWrong: 'Supercells are organized, rotating storms — the ones that can produce big tornadoes.',
  },
  {
    id: 'sci-4',
    category: 'science',
    prompt: 'A shelf cloud usually means…',
    diagram: 'shelf',
    choices: [
      { id: 'a', label: 'Strong winds may be arriving soon', icon: '💨' },
      { id: 'b', label: 'Perfect beach day', icon: '🏖️' },
      { id: 'c', label: 'The storm is over forever', icon: '🎉' },
    ],
    correctId: 'a',
    explainCorrect: 'Shelf = gust front incoming. Sharp call.',
    explainWrong: 'That low wedge cloud often rides the gust front — wind punch incoming. Good lesson locked.',
  },
  {
    id: 'sci-5',
    category: 'science',
    prompt: 'Hail forms when…',
    choices: [
      { id: 'a', label: 'Strong updrafts freeze raindrops again and again', icon: '🧊' },
      { id: 'b', label: 'The sun melts clouds into rocks', icon: '☀️' },
      { id: 'c', label: 'Radar invents it', icon: '📺' },
    ],
    correctId: 'a',
    explainCorrect: 'Updrafts are hail factories. Science check passed.',
    explainWrong: 'Updrafts toss rain up into cold air until it freezes into hail. That’s the real process.',
  },
];

export function questionsFor(category: QuizCategory): QuizQuestion[] {
  return QUESTIONS.filter(q => q.category === category);
}

export function expertRank(percent: number): { title: string; blurb: string } {
  if (percent >= 90) return { title: 'Radar Expert', blurb: 'Elite reads. The desk would hire you.' };
  if (percent >= 75) return { title: 'Storm Chaser', blurb: 'You think like someone who works the field.' };
  if (percent >= 60) return { title: 'Field Spotter', blurb: 'Solid instincts — keep drilling.' };
  if (percent >= 40) return { title: 'Spotter Trainee', blurb: 'You’re in training and already sounding sharp.' };
  return { title: 'Storm Rookie', blurb: 'Every expert started here. Run it again — you’ll climb fast.' };
}
