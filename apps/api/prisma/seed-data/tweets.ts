// Persona-matched chirps. Times are relative to the moment the seed runs ("N days ago at
// HH:MM UTC"), so the timeline always looks recent; days stay within 1–29 so every chirp
// falls inside the last 30 days and never in the future.
import { DEMO_USERNAME } from './users';

export interface SeedTweet {
  daysAgo: number;
  /** Time of day in UTC, `HH:MM`. */
  at: string;
  content: string;
}

const chirp = (daysAgo: number, at: string, content: string): SeedTweet => ({
  daysAgo,
  at,
  content,
});

/** The moment a seed chirp was posted, `daysAgo` days before `now` at its time of day. */
export function seedTweetDate(now: Date, { daysAgo, at }: SeedTweet): Date {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(Number(at.slice(0, 2)), Number(at.slice(3, 5)), 0, 0);
  return date;
}

export const seedTweets: Record<string, SeedTweet[]> = {
  // Joined most recently, so every chirp stays within its first two weeks.
  [DEMO_USERNAME]: [
    chirp(14, '09:15', 'Just set up my Chirp account. What should I read first?'),
    chirp(13, '18:40', 'Followed a bunch of people whose bios made me smile. Good start.'),
    chirp(
      11,
      '12:05',
      "Tried Kenji's tip about resting dough overnight. It works. I am converted.",
    ),
    chirp(
      9,
      '21:30',
      'Hot take: the best feature of any app is a fast way back to the home screen.',
    ),
    chirp(7, '08:10', 'Morning coffee, timeline, then actual work. In that order, unfortunately.'),
    chirp(
      5,
      '16:45',
      'Anyone else keep a list of tiny things that made their week better? Mine: a quiet train ride.',
    ),
    chirp(
      3,
      '19:20',
      'Started running again thanks to @dave_runs. Day one: 2 km and a lot of lost dignity.',
    ),
    chirp(1, '10:00', 'Reading the photo threads here and remembering that I own a camera.'),
  ],
  ana_codes: [
    chirp(
      28,
      '14:30',
      'Reminder: a div with an onClick is not a button. Your keyboard users will thank you.',
    ),
    chirp(
      26,
      '09:05',
      'Spent the morning deleting code. Best kind of pull request: -412 lines, +38.',
    ),
    chirp(
      24,
      '20:15',
      'TypeScript tip: let the compiler infer return types inside a module, annotate them at the boundaries.',
    ),
    chirp(
      21,
      '11:50',
      'Ran a screen reader through our signup form. Three unlabeled inputs. Fixed before lunch.',
    ),
    chirp(19, '17:25', 'Bogotá rain is the perfect soundtrack for refactoring.'),
    chirp(16, '08:40', 'Focus styles are not ugly. Invisible focus is ugly.'),
    chirp(
      13,
      '15:10',
      'Pairing with @sofia_ux today on empty states. Turns out "No data" is not a design.',
    ),
    chirp(
      10,
      '22:05',
      'Learned that the inert attribute works everywhere now. Modal focus traps just got a lot simpler.',
    ),
    chirp(
      7,
      '13:35',
      'Our hottest code path created a date formatter on every render. Hoisted it: the list is 40% faster.',
    ),
    chirp(
      4,
      '10:20',
      'Conference talk accepted! Topic: accessible forms that do not fight the user.',
    ),
    chirp(2, '18:55', 'Friday deploy? No. Friday documentation? Absolutely.'),
  ],
  marco_lens: [
    chirp(
      29,
      '07:20',
      'Golden hour at the old market. The fruit sellers know every photographer by name.',
    ),
    chirp(
      27,
      '19:45',
      'Shot a full roll of Portra today and I am already afraid of the development bill.',
    ),
    chirp(24, '06:50', 'Fog over the river this morning. Walked two hours, kept four frames.'),
    chirp(20, '13:15', 'The best street photos happen when you stop looking for photos.'),
    chirp(
      17,
      '21:00',
      'Darkroom night. Nothing beats watching an image appear in the developer tray.',
    ),
    chirp(
      14,
      '08:30',
      '@chloe_wanders asked which lens I travel with. Answer: one 35mm and comfortable shoes.',
    ),
    chirp(
      11,
      '17:40',
      'Rain turns every street into a mirror. Went out with an umbrella and came back soaked anyway.',
    ),
    chirp(
      8,
      '12:25',
      'Printed my first 30x40. Seeing it on paper changed how I see the whole series.',
    ),
    chirp(
      5,
      '18:10',
      "Photographed Kenji's ramen counter for his new menu. Steam is impossible to light. Loved it.",
    ),
    chirp(
      2,
      '09:35',
      'Contact sheets are underrated. Your mistakes teach you more than your keepers.',
    ),
  ],
  lucia_data: [
    chirp(
      28,
      '10:10',
      '80% of data science is figuring out why a column called "date" contains the word "maybe".',
    ),
    chirp(
      25,
      '15:30',
      'A chart without a labeled axis is just abstract art with a confidence problem.',
    ),
    chirp(
      23,
      '09:45',
      'Our sales spiked every Tuesday because a cron job duplicated orders. Mystery solved.',
    ),
    chirp(
      20,
      '20:20',
      'Plotting coastal flooding data with @amara_climate. The maps are beautiful and terrifying.',
    ),
    chirp(17, '11:05', 'Median, not mean, when the data has billionaires in it.'),
    chirp(14, '16:50', 'Rewrote a two-hour pandas job in SQL. Four minutes. I need to sit down.'),
    chirp(11, '08:25', 'Small multiples beat a single chart with twelve lines every time.'),
    chirp(
      8,
      '19:15',
      'Teaching a workshop on cleaning messy CSVs. Bringing snacks and emotional support.',
    ),
    chirp(
      5,
      '13:40',
      'The model is 94% accurate. The baseline is 93%. Let us talk about that before we celebrate.',
    ),
    chirp(
      2,
      '21:10',
      'Weekend project: tracking how long my sourdough starter takes to double. Yes, there is a dashboard.',
    ),
  ],
  kenji_cooks: [
    chirp(
      29,
      '23:10',
      'Twelve-hour tonkotsu broth is finally ready. The kitchen smells like victory.',
    ),
    chirp(
      27,
      '16:20',
      'Bread experiment #41: 80% hydration. It spread like a pancake. Delicious pancake.',
    ),
    chirp(
      25,
      '22:45',
      'Staff meal tonight: leftover chashu fried rice. The best thing we make and it is not on the menu.',
    ),
    chirp(22, '10:15', 'Tip: rest your dough overnight in the fridge. More flavor, less work.'),
    chirp(19, '23:30', 'Long service. 140 bowls. My feet are filing a complaint.'),
    chirp(
      16,
      '15:05',
      'Dave convinced me to run before work. Day three. Still alive. Still hungry.',
    ),
    chirp(
      13,
      '21:50',
      'New seasonal ramen: miso, roasted corn and a little butter. Testing it this week.',
    ),
    chirp(10, '14:35', 'Milk bread came out perfect. Soft enough to use as a pillow.'),
    chirp(
      7,
      '22:20',
      'Thank you @marco_lens for the menu photos. Now the food has to look that good every night.',
    ),
    chirp(4, '11:45', 'Sharpening knives on a quiet morning is my meditation.'),
    chirp(1, '20:05', 'Sold out of the miso special by 8pm. It stays on the menu.'),
  ],
  sofia_ux: [
    chirp(
      28,
      '11:25',
      'Five user interviews this week and every single person skipped our onboarding carousel. Good to know.',
    ),
    chirp(
      26,
      '17:50',
      'Sketch first, Figma later. Paper does not let you fiddle with border radius.',
    ),
    chirp(
      23,
      '10:35',
      'A good empty state tells you what to do next, not that there is nothing here.',
    ),
    chirp(
      21,
      '14:15',
      'Usability test today: the button everyone missed was the one we were proudest of.',
    ),
    chirp(
      18,
      '09:20',
      'Designing for one-handed phone use changes everything about where actions belong.',
    ),
    chirp(
      15,
      '19:05',
      'My sketchbook from 2019 has the same idea I pitched yesterday. Consistency or lack of growth?',
    ),
    chirp(
      12,
      '12:40',
      '@ana_codes caught a contrast problem in my mockups before I did. Grateful for engineers who care.',
    ),
    chirp(9, '16:10', 'Research tip: ask what people did last time, not what they would do.'),
    chirp(
      6,
      '08:55',
      'Copy is design. Rewrote one error message and the support tickets about it stopped.',
    ),
    chirp(
      3,
      '15:45',
      'Workshop with the product team: we cut three features and the product got better.',
    ),
    chirp(1, '11:30', 'Drew the same icon nine times. The first one was the best. As always.'),
  ],
  dave_runs: [
    chirp(
      29,
      '05:45',
      'Easy 10k at sunrise. Conversational pace, which means I talked to myself the whole time.',
    ),
    chirp(
      27,
      '18:30',
      'Most runners do their easy runs too fast and their hard runs too slow. Fix the first one first.',
    ),
    chirp(
      24,
      '06:10',
      'Long run Sunday: 28 km with the club, in the rain. Nobody complained. Everyone complained.',
    ),
    chirp(
      21,
      '12:00',
      'Your shoes do not need to be expensive. They need to be comfortable and replaced on time.',
    ),
    chirp(18, '05:30', 'Track session: 6 x 800m. Legs said no, coach said yes. The coach is me.'),
    chirp(15, '20:40', 'Rest days are training days. Your body builds fitness while you sleep.'),
    chirp(
      12,
      '06:25',
      "Ran past Kenji's place on the way home. The smell of broth at 7am is a cruel test.",
    ),
    chirp(
      9,
      '17:15',
      'Marathon in four weeks for half the club. Taper talks begin. Panic follows.',
    ),
    chirp(
      6,
      '06:05',
      'Welcome to the new runners who joined this week. Slow miles are still miles.',
    ),
    chirp(
      2,
      '08:50',
      'Hydration reminder: if you wait until you are thirsty, you waited too long.',
    ),
  ],
  amara_climate: [
    chirp(
      28,
      '13:20',
      'Field week on the coast, measuring how mangroves slow storm surge. Muddy, wonderful work.',
    ),
    chirp(
      25,
      '09:30',
      'Healthy wetlands reduce flood damage more cheaply than most seawalls. Nature is infrastructure.',
    ),
    chirp(22, '18:05', 'Back from fieldwork with 3,000 sediment samples and a sunburn.'),
    chirp(
      19,
      '11:40',
      'Working with @lucia_data on visualizing sea level projections. Data people are my favorite people.',
    ),
    chirp(
      16,
      '15:55',
      'Paper accepted! Five years of coastal monitoring condensed into twelve pages.',
    ),
    chirp(
      13,
      '10:15',
      'Climate adaptation is local. What works for one coastline can fail on the next.',
    ),
    chirp(
      10,
      '19:30',
      'Talked to fishers today about how the shoreline changed in their lifetimes. Better data than any satellite.',
    ),
    chirp(7, '08:45', 'Small actions add up, and policy adds up faster. Vote local.'),
    chirp(
      4,
      '14:25',
      'Planted 400 mangrove seedlings with a school group. The kids were faster than the researchers.',
    ),
    chirp(1, '17:05', 'Ocean temperature data from this year still has me staring at the screen.'),
  ],
  liam_pixels: [
    chirp(
      29,
      '21:40',
      'Devlog #23: crops now wilt if you forget to water them. Players will hate me. Good.',
    ),
    chirp(
      27,
      '00:15',
      'Fixed a bug where chickens walked through walls. They were just very determined.',
    ),
    chirp(
      24,
      '19:25',
      'Pixel art tip: fewer colors make a scene feel more cohesive. Start with eight.',
    ),
    chirp(
      22,
      '23:55',
      'Added rain. Then the sound of rain on the barn roof. Now I just sit in my own game and relax.',
    ),
    chirp(
      19,
      '16:30',
      'Playtest feedback: "the fishing is too relaxing". I think that is a compliment.',
    ),
    chirp(
      16,
      '22:10',
      'Working with @mateo_beats on the soundtrack. The spring theme made me tear up a little.',
    ),
    chirp(
      13,
      '20:45',
      'Today I learned that saving in the middle of a cutscene can resurrect a cow. Fixing.',
    ),
    chirp(
      10,
      '18:20',
      'Wishlists crossed 5,000. Thank you. I did not expect anyone to care about my turnips.',
    ),
    chirp(
      7,
      '23:15',
      'Scope creep update: the game now has a fishing journal, a museum and a lighthouse. Help.',
    ),
    chirp(4, '15:50', 'Asked @sofia_ux to look at my menus. She was kind. The menus were not.'),
    chirp(1, '21:05', 'The demo build is live for testers. Please break it gently.'),
  ],
  priya_ships: [
    chirp(28, '08:15', 'Shipping small things often beats shipping big things rarely. Every time.'),
    chirp(
      25,
      '12:55',
      'Wrote the release note before the feature. It forced us to cut half of it. Best decision this month.',
    ),
    chirp(23, '17:30', 'A roadmap is a list of bets, not a list of promises.'),
    chirp(20, '09:10', 'One-on-ones are for the other person. Let them set the agenda.'),
    chirp(
      17,
      '14:45',
      'Our retro found the problem was not our process. It was too many meetings about process.',
    ),
    chirp(
      14,
      '10:35',
      'If you cannot explain why a feature matters in one sentence, your users cannot either.',
    ),
    chirp(
      11,
      '16:20',
      'Shadowed support for a day. Every PM should. My backlog looks completely different now.',
    ),
    chirp(
      8,
      '08:40',
      'Celebrated a launch by deleting the feature flag. Clean code is the real party.',
    ),
    chirp(
      5,
      '13:05',
      'Data from @lucia_data showed nobody uses the export button. Removing it next sprint.',
    ),
    chirp(
      2,
      '11:15',
      'Notes on building teams: trust is built in small, boring, consistent moments.',
    ),
  ],
  mateo_beats: [
    chirp(29, '22:30', 'Late night session. Found a bassline that sounds like a rainy afternoon.'),
    chirp(
      27,
      '15:40',
      'Lo-fi tip: record real room tone and put it under the whole track. Instant warmth.',
    ),
    chirp(24, '23:45', 'Salsa gig tonight. Eleven musicians on a stage built for five. Pure joy.'),
    chirp(
      21,
      '13:25',
      'New beat tape drops Friday. Eight tracks, all recorded on a 15-year-old laptop.',
    ),
    chirp(18, '20:10', 'My neighbors finally asked what I do. I said music. They said "we know".'),
    chirp(
      15,
      '16:55',
      "Writing the spring theme for @liam_pixels's farming game. Strings, flute and a tiny glockenspiel.",
    ),
    chirp(
      12,
      '21:35',
      'The best practice tool for bass is a metronome you are slightly afraid of.',
    ),
    chirp(
      9,
      '14:15',
      "Sampled the sound of Kenji's kitchen for a track. Sizzle, clang, perfect rhythm.",
    ),
    chirp(
      6,
      '23:20',
      'Weekend plan: lo-fi set on Saturday, salsa on Sunday. Monday will be quiet.',
    ),
    chirp(
      3,
      '18:45',
      'The beat tape is out. Thank you to everyone listening on repeat while studying.',
    ),
    chirp(
      1,
      '22:55',
      'Restrung the bass for the first time in a year. It sounds like a new instrument. I am ashamed.',
    ),
  ],
  chloe_wanders: [
    chirp(29, '10:40', 'Landed in Lisbon. First stop: a pastel de nata, for research purposes.'),
    chirp(
      27,
      '08:20',
      'Travel tip: walk the first day without a map. You will find the neighborhood you love.',
    ),
    chirp(
      25,
      '19:55',
      'Country number 41 is officially in the notebook. Writing about it this week.',
    ),
    chirp(
      22,
      '07:35',
      'Night train across the mountains. Slept badly, woke up to the best view of my life.',
    ),
    chirp(19, '15:15', 'Coffee ranking update: a tiny café in Porto just took the top spot.'),
    chirp(
      16,
      '12:30',
      'Traveling slowly means fewer photos and more memories. Mostly. @marco_lens disagrees.',
    ),
    chirp(
      13,
      '17:50',
      "Finished the draft of my piece on coastal villages. Amara's research made it so much richer.",
    ),
    chirp(
      10,
      '09:25',
      'Packing light is a skill. Ten years of practice and I still bring too many books.',
    ),
    chirp(7, '20:05', 'Street food in Marrakech: if there is a queue of locals, join it.'),
    chirp(4, '11:00', 'Home for two weeks. Laundry, editing and missing everywhere at once.'),
    chirp(
      2,
      '16:35',
      'The next trip is booked. I will tell you nothing except that it involves trains.',
    ),
  ],
};
