// Reply threads: short conversations under recent chirps, written to match the personas.
// Everyone who replies is connected to the person they answer by a follow in at least one
// direction (or is that person, in a self-thread). Times are minutes after the chirp being
// answered, clamped to the moment the seed runs.
import type { SeedTweetRef } from './likes';
import { DEMO_USERNAME } from './users';

export interface SeedReply {
  author: string;
  /** Minutes after the chirp it answers. */
  minutesAfter: number;
  content: string;
  replies?: SeedReply[];
}

/** A conversation under one top-level seed chirp. */
export interface SeedThread {
  to: SeedTweetRef;
  replies: SeedReply[];
}

const reply = (
  author: string,
  minutesAfter: number,
  content: string,
  replies?: SeedReply[],
): SeedReply => ({ author, minutesAfter, content, ...(replies ? { replies } : {}) });

export const seedThreads: SeedThread[] = [
  {
    to: { author: DEMO_USERNAME, index: 6 },
    replies: [
      reply('dave_runs', 25, '2 km on day one is exactly how it starts. Same time next week?', [
        reply(DEMO_USERNAME, 40, 'Same time next week. Bring my dignity back, please.', [
          reply('dave_runs', 12, 'Dignity comes back around km 5. See you Saturday.'),
        ]),
      ]),
      reply('ana_codes', 90, "Proud of you. I'm still at the buying-the-shoes stage."),
    ],
  },
  {
    to: { author: DEMO_USERNAME, index: 3 },
    replies: [
      reply('sofia_ux', 18, 'Agreed. And the second best feature is an undo button.', [
        reply(
          DEMO_USERNAME,
          30,
          'Undo is underrated. Everything should have one, Mondays included.',
        ),
        reply('ana_codes', 45, 'Undo, plus a focus ring you can actually see.'),
      ]),
      reply('liam_pixels', 60, 'Writing this on a sticky note above my menu code.'),
    ],
  },
  {
    to: { author: 'ana_codes', index: 9 },
    replies: [
      reply('sofia_ux', 12, "Congratulations! I'll be in the front row taking notes.", [
        reply('ana_codes', 20, "Then I'll practise the slides on you first. Fair warning."),
      ]),
      reply('lucia_data', 35, 'Accessible forms deserve a keynote. Well deserved.'),
      reply(DEMO_USERNAME, 50, 'Will it be recorded? I want to send it to my whole team.', [
        reply('ana_codes', 15, "It will. I'll post the link here."),
      ]),
    ],
  },
  {
    to: { author: 'lucia_data', index: 8 },
    replies: [
      reply('priya_ships', 22, 'Saving this for the next roadmap review. Context is everything.', [
        reply('lucia_data', 18, 'Always ask for the baseline. Then ask for the error bars.', [
          reply('priya_ships', 9, 'Adding both to the launch checklist.'),
        ]),
      ]),
      reply(
        'amara_climate',
        40,
        'Same with climate models: skill is measured against a simple forecast, not against zero.',
      ),
    ],
  },
  {
    to: { author: 'kenji_cooks', index: 10 },
    replies: [
      reply('dave_runs', 30, 'Save me a bowl. It is the least you owe me after the 7am broth.', [
        reply('kenji_cooks', 25, 'Deal. Run there, eat, walk home.'),
      ]),
      reply('marco_lens', 45, "Photographing it tomorrow before it's gone again."),
    ],
  },
  {
    to: { author: 'chloe_wanders', index: 10 },
    replies: [
      reply('chloe_wanders', 3, 'Okay, one hint: three countries, zero planes.', [
        reply('chloe_wanders', 5, 'Second hint: night trains. I am unreasonably excited.'),
      ]),
      reply('mateo_beats', 20, "Make a playlist for the night train and I'll score it."),
      reply('marco_lens', 40, 'Bring film. Train windows at dusk are magic.'),
    ],
  },
  {
    to: { author: 'liam_pixels', index: 10 },
    replies: [
      reply('sofia_ux', 15, 'Played for ten minutes. The menus are so much better now.', [
        reply('liam_pixels', 8, 'That is entirely your fault. Thank you.'),
      ]),
      reply(DEMO_USERNAME, 40, 'Caught my first fish. Then my second. Then it was 2am.'),
    ],
  },
  {
    to: { author: 'priya_ships', index: 8 },
    replies: [
      reply(
        'lucia_data',
        14,
        'The query took five minutes. Removing the button will take longer.',
        [reply('priya_ships', 10, 'Three meetings, minimum. Worth it.')],
      ),
    ],
  },
  {
    to: { author: 'marco_lens', index: 9 },
    replies: [
      reply('marco_lens', 4, 'The rule I use: circle one frame per roll, then write down why.'),
      reply('chloe_wanders', 30, 'Stealing this rule for my travel edits.'),
    ],
  },
];

/** A reply in insertion order: every parent comes before its replies. */
export interface FlatSeedReply {
  reply: SeedReply;
  thread: SeedThread;
  /** Position of the reply it answers in the flattened list; null when it answers the chirp. */
  parent: number | null;
  /** 1 for a direct reply to the chirp. */
  depth: number;
}

/** Walks every thread depth-first, so inserting in order always finds the parent. */
export function flattenSeedThreads(threads: SeedThread[]): FlatSeedReply[] {
  const flat: FlatSeedReply[] = [];
  const visit = (
    thread: SeedThread,
    replies: SeedReply[],
    parent: number | null,
    depth: number,
  ) => {
    for (const item of replies) {
      flat.push({ reply: item, thread, parent, depth });
      visit(thread, item.replies ?? [], flat.length - 1, depth + 1);
    }
  };
  for (const thread of threads) visit(thread, thread.replies, null, 1);
  return flat;
}

/** A reply's moment: some minutes after what it answers, never in the future. */
export function seedReplyDate(now: Date, answered: Date, minutesAfter: number): Date {
  return new Date(Math.min(answered.getTime() + minutesAfter * 60_000, now.getTime()));
}
