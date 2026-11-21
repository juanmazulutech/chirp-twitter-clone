---
name: Chirp
description: A calm, chronological microblog where every chirp is a letter, postmarked with the moment it was sent.
colors:
  paper: "#f6f8fc"
  paper-night: "#0c1630"
  sheet: "#ffffff"
  sheet-night: "#121f40"
  ink: "#14254a"
  ink-night: "#eef2fb"
  ink-muted: "#4f5d7e"
  ink-muted-night: "#a7b3cf"
  hairline: "#dbe2ef"
  hairline-night: "#26365e"
  airmail-red: "#c81e3a"
  airmail-red-night: "#ff6b7d"
  on-airmail-red: "#ffffff"
  on-airmail-red-night: "#2a0610"
  airmail-blue: "#2452b8"
  airmail-blue-night: "#8bb0ff"
  danger: "#a3141f"
  danger-night: "#ff8a8a"
  selection: "#d6e2fb"
  selection-night: "#23407e"
  avatar-1: "#2f7563"
  avatar-2: "#a84a25"
  avatar-3: "#6b4fa8"
  avatar-4: "#2a6391"
  avatar-5: "#8a3b6b"
  avatar-6: "#5e6b1f"
typography:
  headline:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
    letterSpacing: "-0.02em"
  wordmark:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "1.75rem"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  body:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  meta:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
    fontFeature: "\"tnum\" 1"
  caption:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1rem"
  postmark-label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.5625rem"
    fontWeight: 600
    lineHeight: "0.6875rem"
    letterSpacing: "0.04em"
    fontFeature: "\"tnum\" 1"
  postmark-time:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1rem"
    letterSpacing: "0.04em"
    fontFeature: "\"tnum\" 1"
rounded:
  card: "0.875rem"
  full: "9999px"
spacing:
  gutter: "16px"
  row-y: "12px"
  gap: "12px"
  header: "56px"
components:
  button-primary:
    backgroundColor: "{colors.airmail-red}"
    textColor: "{colors.on-airmail-red}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  link:
    textColor: "{colors.airmail-blue}"
  chirp-row:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "12px 16px"
  avatar-fallback:
    backgroundColor: "{colors.avatar-1}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    size: "44px"
  postmark:
    textColor: "{colors.airmail-blue}"
    typography: "{typography.postmark-label}"
    rounded: "{rounded.full}"
    size: "56px"
  header:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.wordmark}"
    height: "56px"
    padding: "0 16px"
---

# Design System: Chirp

## Overview

**Creative North Star: "Postmarked"**

Every chirp is a letter from someone you chose, stamped with the moment it was sent. The world borrows from airmail correspondence: a blue-tinted paper ground, navy ink, the red-and-blue chevron of an airmail envelope, and a round postmark that carries each chirp's time. By night the envelope turns over: a navy ground with paper-tinted ink, the same red and blue lifted so they still pass AA.

Chirp runs in Operate mode. The world lends type, palette, density and one signature move; layout, navigation and controls stay the familiar social-app ones (timeline, composer, profile, follow lists), so nobody needs onboarding. Calm comes from restraint: flat sheets separated by hairlines, one accent per job, and absolute time instead of a ticking "2m".

The surface is dense in the way a phone feed must be (a 44px avatar, 15px body, 12px row padding) but never crowded; the postmark is the only ornament inside a chirp, and the chevron is the only ornament on the page.

**Key Characteristics:**
- Airmail paper and navy ink by day, a navy envelope by night, both following `prefers-color-scheme` through `light-dark()`.
- Airmail red for the one primary action and the liked state; airmail blue for links, selection, focus and the postmark ring.
- One chevron hairline, under the header, and nowhere else.
- Flat: hairline dividers, no decorative shadows.
- Archivo Variable throughout, tabular figures wherever numbers sit.
- Every chirp carries a postmark: day first, 24-hour time, tilted about 6°.

## Colors

A two-accent airmail palette over cool paper and navy ink; every token is a `light-dark()` pair defined once on `:root` in `apps/web/src/styles.css`, and the `-night` keys above are the second half of each pair.

### Primary
- **Airmail Red** (`airmail-red` / `airmail-red-night`): the one primary action on a screen (the "Chirp" button) and the liked state. Text on it uses **Letter White / Wax Seal** (`on-airmail-red`), 5.7:1 by day and 6.8:1 by night.

### Secondary
- **Airmail Blue** (`airmail-blue` / `airmail-blue-night`): links, text selection tint, the caret, the focus ring and the postmark ring. 7.1:1 on the sheet by day, 7.5:1 by night.
- **Selection Wash** (`selection` / `selection-night`): the `::selection` background; text stays ink.

### Neutral
- **Airmail Paper** (`paper` / `paper-night`): the page ground, a blue-tinted white by day and a navy envelope by night.
- **Sheet** (`sheet` / `sheet-night`): raised surfaces: header, chirp rows, panels.
- **Navy Ink** (`ink` / `ink-night`): body text. 14.2:1 on paper by day, 16.0:1 by night.
- **Faded Ink** (`ink-muted` / `ink-muted-night`): handles, meta, counts, captions, inactive icons. 6.6:1 on the sheet by day, 7.7:1 by night.
- **Hairline** (`hairline` / `hairline-night`): the one divider system; also the scrollbar thumb.

### Status
- **Danger** (`danger` / `danger-night`): destructive actions and errors only. 7.8:1 on the sheet by day, 7.1:1 by night.

### Avatar fallbacks
Six fixed mid-dark hues (`avatar-1` … `avatar-6`: green, rust, violet, steel blue, plum, olive) carry white initials when a user has no photo; the colour is derived from the user id. Every one holds white text at 5.4:1 or better, and they do not change between themes.

### Named Rules
**The Red Letter Rule.** Airmail red marks the one primary action and the liked state, nothing else. If a second red element appears on a screen, one of them is wrong.

**The Blue Pen Rule.** Airmail blue means "you can go here or you are here": links, selection, focus and the postmark. It never fills a button.

**The Not By Colour Alone Rule.** No state is carried by colour alone: a liked chirp changes its icon and its accessible state as well as turning red; errors carry words.

**The AA Both Ways Rule.** Every foreground/background pair passes WCAG AA in both themes. A new token ships with its day and night ratios checked, not just its day one.

## Typography

**Display Font:** none (headlines use the body family at weight 700)
**Body Font:** Archivo Variable (with ui-sans-serif, system-ui, sans-serif), self-hosted through `@fontsource-variable/archivo`
**Label/Mono Font:** Archivo Variable with tabular figures (`tabular-nums`)

**Character:** One grotesque family doing every job: slightly wide and sturdy, like the sans of a stamped form, tightened at the top of the hierarchy and opened up only in the postmark.

### Hierarchy
- **Headline** (700, 1.5rem, 2rem, -0.02em): page titles ("Home").
- **Wordmark** (700, 1.25rem, 1.75rem, -0.02em): the "Chirp" wordmark in the header.
- **Title** (600, 1.125rem, 1.75rem): section headings.
- **Body** (400, 0.9375rem, 1.25rem): chirp text; display names sit at 600 in the meta size. Long prose is capped at 65ch.
- **Meta** (400, 0.875rem, 1.25rem, tabular): handles, counts ("12 likes") in faded ink.
- **Caption** (400, 0.75rem, 1rem): secondary labels in faded ink.
- **Postmark** (600, 0.5625rem / 0.6875rem with the time line at 0.75rem / 1rem, +0.04em, uppercase, tabular): only inside the postmark ring.

### Named Rules
**The Tabular Figures Rule.** Wherever digits sit (times, counts, dates) they use tabular figures, so columns of numbers and the postmark do not jitter.

**The One Family Rule.** Archivo Variable is the only typeface. Hierarchy comes from size, weight and tracking, never from a second display face.

## Layout

Mobile-first and familiar. The base layout targets a 390px phone and must remain fully usable at 320px; it scales up at 640px (`sm`) and 1024px (`lg`).

- **Phone:** a 56px header on the sheet (avatar, wordmark) with the chevron hairline beneath it; the timeline as full-bleed rows on the sheet; the red "Chirp" button bottom right, above a 64px bottom navigation.
- **Desktop:** a labelled left rail, a 600px feed column, a right search panel.
- **Rhythm:** 16px side gutter, 12px vertical row padding, 12px gap between avatar and content. A chirp row reserves 64px on the right of its text column so the postmark never collides with the text.

The phone and desktop shells are planned for the app-shell commit; only the header, the chevron and the chirp row are built and rendered at `/styleguide` so far.

### Named Rules
**The Full Bleed Feed Rule.** Feed rows run edge to edge on the sheet and are separated by hairlines. They are never cards, and never cards inside cards.

## Elevation & Depth

Flat. There are no shadows in the system. Depth is tonal: chirps, header and panels sit on the sheet, which sits on the paper ground, and 1px hairlines divide rows. Focus is shown with an outline (2px airmail blue, 2px offset), never a glow.

### Named Rules
**The Hairline Rule.** Structure comes from hairlines and the paper/sheet step. Decorative shadows are not part of this world; if something needs to float (a menu, a dialog), it earns elevation from its behaviour, and that elevation will be added to this file when it is built.

## Shapes

Two shapes do almost all the work: the circle and the softly rounded card.

- **Circles** (`rounded.full`): avatars (44px), the postmark ring (56px) and pill controls such as the primary button.
- **Cards** (`rounded.card`, 0.875rem): panels and containers that are not feed rows. Cards stay in the 12–16px range; pills are reserved for small controls.
- **The chevron edge:** a 4px band of repeating 135° stripes (10px red, 6px sheet, 10px blue, 6px sheet), the airmail envelope border.

### Named Rules
**The One Chevron Rule.** Exactly one chevron hairline per page, under the header. It is the page's only edging; it never frames cards, buttons or dialogs.

## Components

The built primitives are few and deliberate; the full UI primitive set and the app shell arrive in later commits and will be recorded here as they land.

### Buttons
- **Shape:** a full pill (`rounded.full`), 48px tall.
- **Primary:** airmail red with on-airmail-red text, weight 600 at the base 1rem size, 20px horizontal padding. Used once per screen: the "Chirp" action.
- **Focus:** the global focus ring, 2px airmail blue outline at 2px offset.
- **Hover / pressed / disabled:** not yet built.

### Links
- Airmail blue, medium weight, underlined with a 0.2em offset.

### Chirp row
- **Background:** the sheet, full bleed, 1px hairline below each row (none after the last).
- **Grid:** a 44px avatar column and a content column, 12px gap, 12px × 16px padding.
- **Content:** display name (600) and @handle (faded ink) on one meta line, body text below, counts in faded tabular meta.
- **Postmark:** absolutely placed top right (10px from the top, 14px from the right).

### Avatar fallback
- A 44px circle in one of the six avatar hues, white initials at 600. Decorative (`aria-hidden`); the name beside it carries the identity.

### Header
- 56px on the sheet with the wordmark, followed by the chevron edge.

### Postmark (signature)
Every chirp is stamped with the moment it was sent.
- A 56px circle with a 1.5px airmail blue ring and airmail blue text, rotated -6°.
- Three lines: the day, read day first whatever the locale ("21 NOV", month name from the locale, no year); the time in 24-hour tabular figures ("21:42") one step larger; the word "CHIRP".
- Rendered as `<time datetime>` with the full long date and time in a visually hidden label (also the `title`); the visible lines are `aria-hidden`. Times are in the viewer's time zone.
- **Planned, not built:** a "stamp" landing motion when a chirp is posted (scale + opacity, ease-out), removed under `prefers-reduced-motion`.

### Icons
Undecided; the icon set is chosen with the app shell.

## Do's and Don'ts

### Do:
- **Do** define every new colour as a `light-dark()` pair on `:root` and map it through `@theme inline`, then check its AA ratio in both themes.
- **Do** keep airmail red to the one primary action and the liked state.
- **Do** use airmail blue for links, selection, focus and the postmark ring.
- **Do** separate feed rows with 1px hairlines on the sheet, full bleed.
- **Do** use tabular figures for every time, count and date.
- **Do** postmark chirps day first ("21 NOV") with 24-hour time, and expose the full date to assistive technology inside `<time datetime>`.
- **Do** pair every colour-coded state with an icon change, text or `aria-pressed`.
- **Do** let `prefers-reduced-motion` reduce every animation and transition to effectively zero.

### Don't:
- **Don't** add a second chevron edge or use the chevron as a frame; there is exactly one, under the header.
- **Don't** use decorative shadows; depth is paper, sheet and hairline.
- **Don't** wrap feed rows in cards, or nest cards inside cards.
- **Don't** fill buttons with airmail blue or use red for anything but the primary action and the liked state.
- **Don't** carry a state by colour alone.
- **Don't** replace the postmark with relative "2m" labels as the only sense of time.
- **Don't** introduce a second typeface.
- **Don't** use X's name, bird mark or brand blue.
