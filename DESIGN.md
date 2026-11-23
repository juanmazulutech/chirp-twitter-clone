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
  field-border: "#7d8aab"
  field-border-night: "#6576a0"
  airmail-red: "#c81e3a"
  airmail-red-night: "#ff6b7d"
  on-airmail-red: "#ffffff"
  on-airmail-red-night: "#2a0610"
  airmail-blue: "#2452b8"
  airmail-blue-night: "#8bb0ff"
  danger: "#a3141f"
  danger-night: "#ff8a8a"
  on-danger: "#ffffff"
  on-danger-night: "#121f40"
  selection: "#d6e2fb"
  selection-night: "#23407e"
  scrim: "rgb(20 37 74 / 0.45)"
  scrim-night: "rgb(3 7 18 / 0.7)"
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
  field: "0.5rem"
  card: "0.875rem"
  full: "9999px"
spacing:
  gutter: "16px"
  row-y: "12px"
  gap: "12px"
  header: "56px"
  bottom-nav: "64px"
  rail: "15rem"
  side-panel: "20rem"
components:
  button-primary:
    backgroundColor: "{colors.airmail-red}"
    textColor: "{colors.on-airmail-red}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-primary-sm:
    backgroundColor: "{colors.airmail-red}"
    textColor: "{colors.on-airmail-red}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  button-primary-icon:
    backgroundColor: "{colors.airmail-red}"
    textColor: "{colors.on-airmail-red}"
    rounded: "{rounded.full}"
    size: "48px"
  button-ghost:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.danger}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-danger-hover:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-danger}"
  link:
    textColor: "{colors.airmail-blue}"
  field-input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 12px"
    height: "44px"
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
  avatar-fallback-sm:
    backgroundColor: "{colors.avatar-1}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    size: "32px"
  avatar-fallback-lg:
    backgroundColor: "{colors.avatar-1}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    size: "80px"
  modal:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
    width: "min(32rem, calc(100vw - 2rem))"
  toast:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px 16px"
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
  feed-column:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    width: "600px"
  rail-item:
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "48px"
  rail-item-hover:
    backgroundColor: "{colors.paper}"
  rail-item-current:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.airmail-blue}"
  bottom-nav:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    height: "64px"
  bottom-nav-current:
    textColor: "{colors.airmail-blue}"
  bottom-nav-indicator:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.full}"
    width: "56px"
    height: "32px"
  side-panel:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.card}"
    padding: "16px"
  skip-link:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.airmail-blue}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  auth-column:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "32px"
    width: "28rem"
  form-alert:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.danger}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  password-toggle:
    textColor: "{colors.ink-muted}"
    width: "44px"
  password-toggle-hover:
    textColor: "{colors.ink}"
---

# Design System: Chirp

## Overview

**Creative North Star: "Postmarked"**

Every chirp is a letter from someone you chose, stamped with the moment it was sent. The world borrows from airmail correspondence: a blue-tinted paper ground, navy ink, the red-and-blue chevron of an airmail envelope, and a round postmark that carries each chirp's time. By night the envelope turns over: a navy ground with paper-tinted ink, the same red and blue lifted so they still pass AA.

Chirp runs in Operate mode. The world lends type, palette, density and one signature move; layout, navigation and controls stay the familiar social-app ones (timeline, composer, profile, follow lists), so nobody needs onboarding. Calm comes from restraint: flat sheets separated by hairlines, one accent per job, and absolute time instead of a ticking "2m".

The surface is dense in the way a phone feed must be (a 44px avatar, 15px body, 12px row padding) but never crowded; the postmark is the only ornament inside a chirp, and the chevron is the only ornament on the page.

**Key Characteristics:**
- Airmail paper and navy ink by day, a navy envelope by night, both following `prefers-color-scheme` through `light-dark()`. A viewer can pin either one per device (Appearance: System, Light, Dark), which sets `color-scheme` on the root; a script in `index.html` applies the saved choice before the first paint.
- Airmail red for the one primary action and the liked state; airmail blue for links, selection, focus and the postmark ring.
- One chevron hairline, under the header, and nowhere else.
- Flat: hairline dividers, no decorative shadows; one soft float shadow only for things that hover above the page.
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
- **Airmail Paper** (`paper` / `paper-night`): the page ground, a blue-tinted white by day and a navy envelope by night. Also the hover wash of secondary and ghost buttons and of the modal's close button.
- **Sheet** (`sheet` / `sheet-night`): raised surfaces: the feed column with its header and chirp rows, the bottom navigation, panels, fields, modals, toasts.
- **Navy Ink** (`ink` / `ink-night`): body text. 14.2:1 on paper by day, 16.0:1 by night.
- **Faded Ink** (`ink-muted` / `ink-muted-night`): handles, meta, counts, captions, hints, placeholders, inactive icons. 6.6:1 on the sheet by day, 7.7:1 by night.
- **Hairline** (`hairline` / `hairline-night`): the one divider system; also the resting border of secondary buttons, modals and toasts, and the scrollbar thumb.
- **Field Border** (`field-border` / `field-border-night`): the outline of text fields. It is the only cue of where to type, so it clears 3:1 against the sheet and the paper (3.45 / 3.24 by day, 3.59 / 3.97 by night; WCAG 1.4.11), which a hairline cannot.
- **Scrim** (`scrim` / `scrim-night`): the translucent navy veil behind a modal (navy ink at 45% by day, near-black at 70% by night). It is only ever a backdrop, never a surface or a text colour.

### Status
- **Danger** (`danger` / `danger-night`): destructive actions and errors only. As text on the sheet (errors, the outlined danger button) 7.8:1 by day, 7.1:1 by night.
- **On Danger** (`on-danger` / `on-danger-night`): text on a danger fill (white by day, the night sheet by night), seen only when the danger button is hovered. 7.8:1 by day, 7.1:1 by night.

### Avatar fallbacks
Six fixed mid-dark hues (`avatar-1` … `avatar-6`: green, rust, violet, steel blue, plum, olive) carry white initials when a user has no photo; the colour is derived from the user id, so the same person always gets the same hue. Every one holds white text at 5.4:1 or better, and they do not change between themes.

### Named Rules
**The Red Letter Rule.** Airmail red marks the one primary action and the liked state, nothing else. If a second red element appears on a screen, one of them is wrong.

**The Blue Pen Rule.** Airmail blue means "you can go here or you are here": links, selection, focus and the postmark. It never fills a button.

**The Not By Colour Alone Rule.** No state is carried by colour alone: a liked chirp changes its icon and its accessible state as well as turning red; errors carry an icon and words.

**The AA Both Ways Rule.** Every foreground/background pair passes WCAG AA in both themes. A new token ships with its day and night ratios checked, not just its day one.

## Typography

**Display Font:** none (headlines use the body family at weight 700)
**Body Font:** Archivo Variable (with ui-sans-serif, system-ui, sans-serif), self-hosted through `@fontsource-variable/archivo`
**Label/Mono Font:** Archivo Variable with tabular figures (`tabular-nums`)

**Character:** One grotesque family doing every job: slightly wide and sturdy, like the sans of a stamped form, tightened at the top of the hierarchy and opened up only in the postmark.

### Hierarchy
- **Headline** (700, 1.5rem, 2rem, -0.02em): page titles ("Home", "Search", "Page not found", "Sign in to Chirp").
- **Wordmark** (700, 1.25rem, 1.75rem, -0.02em): the "Chirp" wordmark in the header.
- **Title** (600, 1.125rem, 1.75rem): section headings, modal titles, empty-state titles, the route-error heading; also the size of the rail's navigation labels (500, 700 for the current page).
- **Body** (400, 0.9375rem, 1.25rem): chirp text, modal body, toast messages; display names sit at 600 in the meta size. Long prose is capped at 65ch.
- **Meta** (400, 0.875rem, 1.25rem, tabular): handles, counts ("12 likes") in faded ink; field labels at 600 in ink, hints in faded ink, small buttons at 600.
- **Caption** (400, 0.75rem, 1rem): secondary labels in faded ink; the character counter (tabular); the bottom navigation's labels (500, 700 for the current page).
- **Postmark** (600, 0.5625rem / 0.6875rem with the time line at 0.75rem / 1rem, +0.04em, uppercase, tabular): only inside the postmark ring.

Buttons set their label at 600: 1rem in the default size, 0.875rem in the small one.

### Named Rules
**The Tabular Figures Rule.** Wherever digits sit (times, counts, dates, the character counter) they use tabular figures, so columns of numbers and the postmark do not jitter.

**The One Family Rule.** Archivo Variable is the only typeface. Hierarchy comes from size, weight and tracking, never from a second display face.

## Layout

Mobile-first and familiar. The base layout targets a 390px phone and must remain fully usable at 320px; it scales up at 640px (`sm`) and 1024px (`lg`).

The shell is three columns centred on the paper ground: the left rail, the feed column, the side panel. Only the feed column is on the sheet.

- **Phone (base):** the feed column fills the width on the sheet. Its 56px sticky header (your avatar and the wordmark) carries the chevron beneath it. A fixed 64px bottom navigation sits on the sheet with a hairline above it and pads itself for the home indicator (`safe-area-inset-bottom`); the main content pads its bottom by the same amount so nothing hides under it. The round red compose button floats 16px from the right edge and 16px above the bottom navigation.
- **Tablet (640px, `sm`):** the bottom navigation and floating compose button go away. An icon-only left rail appears (12px side padding, 64px from the top), and the feed column caps at 600px (`max-w-150`) with hairlines on both sides; the paper ground shows around it.
- **Desktop (1024px, `lg`):** the rail widens to a labelled 15rem column, and a 20rem side panel (24px side padding, 64px from the top) holds the people search.
- **Header:** lives inside the feed column at every width and sticks to the top as the column scrolls; the rail and side panel are sticky full-height columns of their own.
- **Rhythm:** 16px side gutter, 12px vertical row padding, 12px gap between avatar and content. A chirp row reserves 64px on the right of its text column so the postmark never collides with the text.
- **Overlays:** modals centre in the viewport at up to 32rem wide, keeping 1rem clear on each side of a phone. Toasts stack bottom centre, lifted 80px on phones to clear the 64px bottom navigation.
- **Scroll:** the page always reserves its scrollbar gutter (`scrollbar-gutter: stable`), so moving between short and long pages never shifts the layout sideways. While a modal is open the gutter is traded for padding of the same width (`lockPageScroll`), so the scrim covers the whole window, including where a classic scrollbar sat, and the content stays put.

- **Signed-out frame (sign in, create account):** no rail, no bottom navigation, no side panel. A full-width sheet header (56px, the wordmark, the chevron beneath it) sits over one column of form. On phones the column is the sheet itself, full bleed, filling the rest of the viewport with a 16px gutter and 32px top and bottom padding. From 640px it becomes a 28rem (`max-w-md`) bordered sheet card on the paper, 48px below the header and 32px gutters; the header's wordmark lines up with the column's edge. Inside, 24px separates the headline, the form and a footer line that sits under a hairline (24px above its text) and links to the other screen.

The shell lives in `apps/web/src/app/layout/`; the signed-out frame in `apps/web/src/features/auth/components/AuthLayout.tsx`; the primitives and the chirp row are also rendered at `/styleguide`.

### Named Rules
**The Full Bleed Feed Rule.** Feed rows run edge to edge on the sheet and are separated by hairlines. They are never cards, and never cards inside cards.

## Elevation & Depth

Flat by default. Depth is tonal: chirps, header and panels sit on the sheet, which sits on the paper ground, and 1px hairlines divide rows. Focus is shown with an outline (2px airmail blue, 2px offset), never a glow.

Three things leave the page. Toasts and the phone's floating compose button float, and carry the one shadow in the system. Modals do not cast a shadow: the scrim dims the page behind them, and they keep the sheet, a hairline border and the card radius.

### Shadow Vocabulary
- **Float** (`shadow-float`: `box-shadow: 0 6px 16px var(--float-shadow)`, where `--float-shadow` is navy ink at 18% by day and black at 50% by night): toasts and the phone's floating compose button.

### Named Rules
**The Hairline Rule.** Structure comes from hairlines and the paper/sheet step. The only shadow is `shadow-float`, and it belongs only to things that float above the page (toasts and the phone's compose button); a modal is set apart by the scrim instead. No other shadow exists in this world: not on cards, rows, buttons, fields or menus at rest.

## Shapes

Three radii do all the work: the circle, the softly rounded card and the gently rounded field.

- **Circles** (`rounded.full`): avatars (32, 44 and 80px), the postmark ring (56px), every button (a pill at 44px or 36px tall, or a 48px or 36px circle when it holds only an icon), the modal's 36px close button, the rail's navigation items and the bottom navigation's 56×32px current-page pill.
- **Cards** (`rounded.card`, 0.875rem): panels, modals, toasts and the signed-out column from 640px: containers that are not feed rows. Cards stay in the 12–16px range; pills are reserved for controls.
- **Fields** (`rounded.field`, 0.5rem): text inputs, textareas and the form alert, a tighter corner than the card so a form reads as writing space, not as another panel.
- **The chevron edge:** a 4px band of repeating 135° stripes (10px red, 6px sheet, 10px blue, 6px sheet), the airmail envelope border.

### Named Rules
**The One Chevron Rule.** Exactly one chevron hairline per page, under the header. It is the page's only edging; it never frames cards, buttons or dialogs.

## Components

Screens are built from the primitives in `apps/web/src/components/ui/`; nothing re-creates a button, field or dialog by hand. The app shell built from them lives in `apps/web/src/app/layout/`.

### Buttons
Pills that say what they do; one red one per screen.
- **Shape:** a full pill (`rounded.full`). Four sizes: default 44px tall with 20px horizontal padding and a 1rem label; small 36px tall with 16px padding and a 0.875rem label; icon, a 48px circle with no padding that holds only an icon and must carry an `aria-label`; small icon (`icon-sm`), the same at 36px, for actions inside a chirp row. Labels at 600, icon and text 8px apart.
- **Primary:** airmail red with on-airmail-red text. The one main action on a screen ("Chirp", "Sign in"). Hover darkens it slightly (95% brightness), pressed a step more (90%).
- **Secondary:** the sheet with a hairline border and ink text, for every other action ("Follow", "Cancel"). Hover takes the paper wash.
- **Ghost:** no fill or border, faded ink text; hover takes the paper wash and ink text. For quiet actions in toolbars, menus and modal cancels.
- **Danger:** **outlined**, never filled at rest: the sheet with a danger border and danger text, so it never reads as the primary action even beside it. Hover fills it with danger and on-danger text. Only for confirming something destructive ("Delete chirp").
- **Loading:** the button keeps its full colour and width; the label hides and a spinner sits centred in it. It is marked `aria-busy`, blocks the action, and shows a wait cursor.
- **Disabled:** fades to 50% opacity with a not-allowed cursor.
- **Focus:** the global focus ring, 2px airmail blue outline at 2px offset.
- **Button link:** navigation that looks like a button ("Sign up" on the sign-in page) shares exactly the same variants and sizes.

### Links
- Airmail blue, medium weight, underlined with a 0.2em offset.

### Fields
A labelled control, accessible by construction: label, control, hint and error are wired together, never assembled by hand.
- **Structure:** label (meta size, 600, ink), then the control, then an optional hint (meta size, faded ink) and the error; 6px between them.
- **Input:** 44px tall, 12px horizontal padding, the sheet with a 1px field-border outline (≥3:1), gently rounded (`rounded.field`, 8px), ink text, faded-ink placeholder. Hover darkens the border to ink.
- **Textarea:** the same skin, at least 96px tall with 10px vertical padding, resizable vertically. An optional counter sits under it on the right in caption size, tabular: "N characters left" in faded ink, or "N over the limit" in danger at 600. It counts Unicode code points, so an emoji counts as one.
- **Focus:** the global focus ring.
- **Error:** the control's border turns danger and it is marked invalid; the message below is danger text at 500 led by a 16px alert icon, so it never relies on colour alone. A textarea over its limit is marked invalid too.
- **Disabled:** 50% opacity, not-allowed cursor.

### Password field
A password input that can show what was typed, which saves retyping on phones.
- The field's input with a toggle inside its right edge: a 44px-wide, full-height button (the input reserves 48px of right padding for it) holding a 20px Eye icon, EyeOff while the password is shown; faded ink, ink on hover.
- Its name stays "Show password" in both states; `aria-pressed` carries whether it is on, so the state never lives in the icon alone.
- `PasswordInput` in `apps/web/src/features/auth/components/`; it is wrapped in a `Field` like any input.

### Form alert
A problem with the whole form rather than one field: wrong credentials, too many attempts, no connection.
- `FormAlert` (`apps/web/src/components/ui/FormAlert.tsx`): the sheet with a 1px danger border, the field radius, 10px × 12px padding; meta-size danger text at 500 led by a 16px alert-circle icon, 8px apart.
- `role="alert"`, so it is announced when it appears. It sits at the top of the form, above the first field, and clears when the form is submitted again or the demo account is filled in.
- Field problems stay on their fields (the first one takes focus); the alert carries only what no single field owns (`applyServerError`, `apps/web/src/lib/form-errors.ts`).

### Auth forms
- **Sign in** ("Sign in to Chirp"): Email, then Password with the show toggle; no hints. Then, 12px apart, the full-width red "Sign in" and a full-width secondary "Use the demo account", which fills both fields and moves focus to Password without submitting, so the visitor still presses "Sign in". Footer: "New to Chirp? Create an account".
- **Create account** ("Create your account"): Name, Username, Email, Password, each with a hint that says what it is for ("Shown on your profile and chirps. You can change it later."; "3–15 letters, numbers or underscores. Your profile lives at /username."; "For signing in. Never shown on your profile."; "At least 8 characters."), then the full-width red "Create account". Footer: "Already have an account? Sign in".
- Fields sit 20px apart and validate once touched; the primary button shows its spinner while the request runs (the demo button is disabled meanwhile).
- **Errors** name the problem once and never repeat the hint: "Choose a username", "Use at least 3 characters", "Choose a password", "Enter your name". Form-level copy says what to do: "That email and password don’t match. Check both and try again." (it never says which one was wrong), "Too many attempts. Wait a minute and try again.", "Something went wrong. Try again in a moment."
- **Hand-off:** signing in opens `/home`; creating an account opens `/search` with the toast "Welcome to Chirp. Follow a few people to fill your timeline."

### Modal
A letter laid on the desk: the page dims, one sheet sits on top.
- Built on the native `<dialog>`: the browser traps focus, closes it on Escape and returns focus to the opener.
- **Box:** the sheet, a hairline border, the card radius, 24px padding, 16px between parts; up to 32rem wide, keeping 1rem clear of a phone's edges. No shadow.
- **Backdrop:** the scrim.
- **Close button:** top right (12px in), a 36px circle with an X icon in faded ink; hover takes the paper wash and ink.
- **Parts:** a title (title size, 600, slightly tightened) that names the dialog, the body in body size and faded ink, and the actions right-aligned with 12px between them, wrapping on narrow screens.
- **Closes on:** Escape, the close button, or a genuine backdrop click (a drag that starts inside the dialog does not count).
- **Scroll:** the page behind is locked while it is open; its scrollbar gutter becomes padding of the same width, so the scrim reaches the window's edge and the layout stays still.

### Appearance choice
The Appearance dialog (rail foot above Sign out; phone header beside it) uses the Modal with a native radio group.
- **Options:** full-width rows with a hairline border and the field radius, 12px × 16px padding: a 20px icon in faded ink (Monitor, Sun, Moon), the label in 600 ink and a one-line description in faded ink, and the radio at the trailing edge.
- **Radio:** drawn from the palette, not the browser's: a 20px circle with a 2px field-border ring on the sheet; checked, the ring thickens to 6px of airmail blue. The checked row also takes the paper wash and an airmail-blue border, so the choice never rests on colour alone.
- **Behaviour:** a choice applies at once (the page behind the scrim previews it), focus opens on the current choice, and Done only closes the dialog.

### Toast
A short note that confirms or apologises, then leaves.
- Shown only through `notify.success` / `notify.error` (`apps/web/src/lib/notify.ts`); never through the toast library directly.
- **Box:** the sheet, a hairline border, the card radius, 12px × 16px padding, 12px between icon and text, and `shadow-float`. The message is body size at 500; an optional description is meta size in faded ink.
- **Success:** a check-circle icon in ink.
- **Error:** an alert-circle icon in danger, and the border turns danger.
- **Placement:** bottom centre, 80px up on phones to clear the bottom navigation; each stays 5 seconds. The region is labelled "Notifications".
- A modal's top layer covers the toast region, so close any open modal before showing a toast.

### Spinner
- A 2.5px ring in the current text colour (the track at 25%) with a turning arc, 20px by default. Named "Loading" for assistive technology unless a parent already announces the busy state. Under reduced motion it stands still.

### Empty state
What a list shows when there is nothing in it yet, and what to do about it.
- Centred, 48px vertical and 24px horizontal padding, 12px between parts.
- A title (title size, 600, ink) as a section heading (level 2 by default, level 3 to keep the page's heading order), an optional description in faded ink capped at 40ch, and an optional call to action (usually a button link) below.

### Chirp row
- **Background:** the sheet, full bleed, 1px hairline below each row (none after the last).
- **Grid:** a 44px avatar column and a content column, 12px gap, 12px × 16px padding.
- **Content:** display name (600) and @handle (faded ink) on one meta line, body text below, counts in faded tabular meta.
- **Replies:** under the name line, "Replying to @handle" in faded meta with the handle as an airmail-blue link to that profile.
- **Postmark:** absolutely placed top right (10px from the top, 14px from the right).
- **Action row:** 4px under the body text, the like toggle at the start and, on your own chirps only, the delete action at the end (kept clear of the postmark by the content column's right padding).
- **Like toggle:** a 36px round icon button (20px Heart) pulled 8px left so the heart lines up with the text, then the count ("12 likes") in meta. At rest faded ink, the heart turning airmail red on hover with the paper wash. Liked: the heart **filled** in airmail red and the count in ink at 600, with `aria-pressed="true"`, so the state never lives in colour alone. Named "Like" in both states. It changes at once and rolls back with an error toast if the server refuses.
- **Delete action:** a ghost `icon-sm` (36px) button with an 18px Trash icon, named "Delete chirp". It opens a confirmation modal ("Delete chirp?", what will happen, then Cancel as ghost and Delete as the outlined danger button, which takes focus). Delete shows its loading state; a failure keeps the dialog open with a form alert; success closes the dialog and then shows the "Your chirp was deleted" toast.

### Conversation page
- **Address:** `/:username/status/:id`, opened from any chirp's postmark (a link named "Open chirp, …" with a light fade on hover). A wrong username in the address is corrected in place.
- **Heading:** "Conversation", since the header already carries the wordmark.
- **Above:** the chirps a reply answers, root first, as ordinary chirp rows with no hairlines between them, joined by a 2px hairline-coloured thread line that runs from under each avatar into the next row's avatar. When the API stops at 20, an airmail-blue "Show earlier chirps" link (ArrowUp icon) leads to the next chirp up.
- **The chirp:** the same parts as a row, laid out to be read: avatar beside the name over the @handle, "Replying to @…" if it answers someone, the text a step larger (1.125rem / 1.75rem), the image unframed by the row's padding, the full date in faded meta ("November 20, 2026 at 8:25 PM"), then the action row above a hairline. The postmark stays top right but is not a link here.
- **Below:** its direct replies, oldest first, through the shared infinite list ("No replies yet" when empty).
- **States:** a spinner while the chirp loads; "This chirp doesn’t exist" (it may have been deleted with its conversation) with a "Back to home" button link; an alert with "Try again" if the chirp or the conversation above fails.

### Profile header
- A section named "Profile" on the sheet under the page heading (which carries the display name), 16px padding, 12px gaps, hairline below.
- Top row: the large (80px) avatar at the start, the action at the end: **Follow** for other people (secondary, 44px); on your own profile **Edit profile** (secondary, with a 16px pencil icon), which opens the edit modal.
- Then the display name (title size, 600) over the @handle (meta, faded ink); the bio in body text (capped at 65ch, line breaks kept), omitted when empty; "Joined November 2026" in meta faded ink after a 16px calendar icon; the counts as two links ("**12** Following", "**8** Followers", figures in ink at 600 and tabular, words in faded ink, underlined on hover) leading to the follow lists.
- **Follow button:** secondary. "Follow" with a UserPlus icon; once following, "Following" with a UserCheck icon and `aria-pressed="true"`, so the state is in the words, the icon and the accessible state, never in colour. It changes at once (the follower count with it) and rolls back with an error toast if the server refuses.
- **Unknown account:** the page heading "Account not found", then an empty state ("This account doesn’t exist", what to do) with a secondary "Search people" button link.

### Chirp images
- **Composer:** a ghost 36px "Add image" icon button (20px ImagePlus) at the start of the action row, opposite Chirp; disabled while an image is attached (one per chirp). The picked image previews at once in a 16:9 frame with the field radius and a hairline, a 36px "Remove image" button on the sheet in its top-right corner and, while it uploads, a 4px airmail blue progress bar along its bottom (`role="progressbar"`). Chirp stays disabled until the image is ready or removed. A refused file (type, size) or failed upload shows an alert line in danger text led by the alert icon.
- **In the feed:** under the chirp text, 8px down: full content width, a fixed 16:9 frame cropping with `object-cover`, the field radius, a hairline, paper behind it while it loads (lazily).

### Search
- **Field:** "Search people" with a 20px search icon inside its start (the input pads 40px for it), placeholder "Name or @username". On phones and tablets it sits under the "Search" heading; on desktop it lives in the side panel's card and the page shows only results.
- **Live results:** results follow the field once typing pauses (300 ms) and at once on Enter; the address holds the search, so back and forward restore it. The previous results stay on screen while the next ones load, so the list never flashes a spinner per keystroke.
- **Results:** person rows (as in the follow lists) under the shared list states, ending with "That’s everyone."; nothing typed shows "Find people to follow"; no match shows "No one matches “…”" with what to try instead.

### Edit profile modal
- The standard modal titled "Edit profile": the large avatar (labelled "Profile picture") beside a small secondary "Change picture" ("Add picture" without one) and a small ghost "Remove picture"; a picked picture uploads at once and previews in the avatar, the change button showing its loading state meanwhile, and a refused or failed upload shows an alert line under them. Then the **Name** field (single line, a live code-point counter under it, focused on open) and the **Bio** field (three-row textarea with its counter and the hint "A few words about you, shown on your profile."). Over the limit, the counter turns danger at 600 and the field is marked invalid.
- Actions: Cancel (ghost) and **Save** (primary, the screen's one red action), disabled until something changed and loading while it saves. Field problems sit on their fields; anything else in a form alert at the top. Cancel drops unsaved edits. Saving closes the dialog, then shows the "Your profile is saved" toast, and the new name appears at once in the header, the session and, after a refetch, every chirp and list.

### Follow lists
- **Tabs:** "Followers" and "Following" share one page under the display-name heading: two equal-width links on the sheet with a hairline below, 12px above each label. The current one is marked four ways: `aria-current="page"`, a bold label (700 against 500), airmail blue, and a 3px airmail blue bar under the label. Hover takes the paper wash. Switching replaces the history entry.
- **Person row:** full bleed like a chirp row (12px × 16px padding, hairline below): the 44px avatar, then the display name (meta at 600, a link to the profile) over the @handle (faded meta), both truncating; the small Follow button at the end, absent on your own row.
- **States:** the shared infinite list: a spinner while the first page loads, an alert with "Try again" when it fails, "That’s everyone." under the last person; empty lists say who will appear there.

### Avatar
- A circle in three sizes: small 32px, default 44px, large 80px (profile header). It shows the user's picture, or, without one (or if it fails to load), white initials at 600 on one of the six avatar hues, derived from the user id. Up to two initials from the display name; "?" when there are none.
- **Decorative by default** (`aria-hidden`, empty alt): beside a visible name, the name carries the identity and is not read twice. An avatar that stands alone takes an opt-in label and is then announced as an image with that name.

### Header
- 56px on the sheet with the wordmark (16px side padding) linking home, followed by the chevron edge. On phones, once the session is known, your small (32px) avatar sits before the wordmark, 12px apart, as the link to your profile (named "Your profile"); from 640px the rail's Profile item does that job. On phones a ghost 48px icon button with the sign-out icon (named "Sign out") closes the row at the trailing edge, its icon aligned with the 16px padding; from 640px the rail's foot does that job. Sticky at the top of the feed column at every width; never spans the rail or the side panel.

### Navigation
Two renderings of one list of destinations (Home, Search, and Profile, your own profile, which appears once the session is known; Notifications joins with its feature). Profile stays current on your profile's follower and following lists too, both labelled "Primary", so phone and desktop always offer the same places.
- **Current page:** marked four ways, never by colour alone: `aria-current="page"`, a bolder label (700 against 500), a paper-tinted pill, and airmail blue. Icons are 24px.
- **Left rail (from 640px):** on tablets, 48px circles holding only the icon (named by `aria-label`), 4px apart, ink at rest with the paper wash on hover. From 1024px each item becomes a 48px-tall full-width pill with 16px padding, the icon and a title-size label 16px apart. The compose button sits 16px below the list. **Sign out** sits alone at the rail's foot (24px above the bottom), shaped like the items but in faded ink at rest, since it leaves rather than goes somewhere: icon only on tablets, icon and "Sign out" from 1024px; hover takes the paper wash and ink. It signs out at once, without a confirmation or a toast: the sign-in screen that follows is the confirmation. If the server cannot be reached, an error toast says so and the session stays open.
- **Bottom navigation (phone):** a fixed 64px bar on the sheet with a hairline top, one equal-width item per destination: the icon in a 56×32px pill (paper when current) over a caption-size label, 4px apart; faded ink at rest. Its focus ring is drawn 4px inside the item, because the bar sits on the screen edge where an outer ring would be clipped.
- **Skip link:** "Skip to content" is the first focusable element. It is parked above the viewport and slides in at the top left on focus as a sheet pill with a hairline border, 8px × 16px padding and airmail blue text at 600; it moves focus to the main content.

### Compose button
The one red action of the shell; every compose button opens the "New chirp" modal.
- **Phone:** a 48px red circle (icon size) with a 24px pen icon and `shadow-float`, fixed 16px from the right and 16px above the bottom navigation.
- **Rail:** on tablets the same 48px red circle with a 20px pen icon; on desktop it spans the rail's width as a labelled "Chirp" pill (48px tall, 20px padding). Both are named "New chirp".

### Side panel and search field
- **Panel (from 1024px):** one sheet card (hairline border, card radius, 16px padding) in the 20rem column. It holds only the people search for now.
- **Search field:** a field labelled "Search people" with a 20px search icon in faded ink 12px inside the left edge (the text starts 40px in), placeholder "Name or @username". Submitting goes to the search page; every copy of the field shows the query from the address (`?q=`), so they always agree.

### Page heading
- Each route opens with its headline (`h1`) on the sheet, 12px × 16px padding and a hairline below, then an optional toolbar (the phone search field), then the page content or its empty state.
- Every route names the browser tab "<Page> · Chirp".

### Route states
- **Loading (first visit):** a 32px spinner in faded ink, centred in the viewport, while the opening screen's code arrives and while the session is being checked.
- **Access:** signed-out visitors to any shell page land on sign-in and return to that page once signed in; signed-in visitors to sign-in or account creation go to the timeline. If the session cannot be checked (server down), the route error shows instead of sign-in.
- **Not found:** centred like an empty state (48px × 24px padding, 12px gaps): a headline, a description in faded ink capped at 40ch, and a secondary "Go to your timeline" button link.
- **Route error:** the same centred layout, announced as an alert: a 32px alert icon in danger, a title-size heading, words that say what to do, and a secondary "Reload" button. Inside the shell, so navigation stays usable.

### Postmark (signature)
Every chirp is stamped with the moment it was sent.
- A 56px circle with a 1.5px airmail blue ring and airmail blue text, rotated -6°.
- Three lines: the day, read day first whatever the locale ("21 NOV", month name from the locale, no year); the time in 24-hour tabular figures ("21:42") one step larger; the word "CHIRP".
- Rendered as `<time datetime>` with the full long date and time in a visually hidden label (also the `title`); the visible lines are `aria-hidden`. Times are in the viewer's time zone.
- **Planned, not built:** a "stamp" landing motion when a chirp is posted (scale + opacity, ease-out), removed under `prefers-reduced-motion`.

### Icons
- Lucide line icons at a 1.75 stroke, usually 16–20px, in the current text colour and `aria-hidden` (the text or label beside them carries the meaning). Never emoji or Unicode glyphs as icons.

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
- **Do** build screens from the primitives (Button, ButtonLink, Avatar, Field, Modal, Spinner, EmptyState) and show toasts only through `notify`, after any open modal has closed.
- **Do** confirm destructive actions with the outlined danger button.
- **Do** keep a busy button at full colour with its spinner; fade only buttons that are genuinely disabled.
- **Do** draw icons from Lucide at a 1.75 stroke.
- **Do** mark the current page with `aria-current`, a bolder label and the paper pill as well as airmail blue.
- **Do** write each error as one message that names the problem and what to do ("Use at least 3 characters"), never repeating the field's hint; put problems no single field owns in the form alert at the top of the form.

### Don't:
- **Don't** add a second chevron edge or use the chevron as a frame; there is exactly one, under the header.
- **Don't** use decorative shadows; depth is paper, sheet and hairline, and `shadow-float` is reserved for things that float (toasts, the phone's compose button).
- **Don't** wrap feed rows in cards, or nest cards inside cards.
- **Don't** fill buttons with airmail blue or use red for anything but the primary action and the liked state.
- **Don't** fill the danger button at rest; it is outlined so it never competes with the primary action.
- **Don't** carry a state by colour alone.
- **Don't** replace the postmark with relative "2m" labels as the only sense of time.
- **Don't** introduce a second typeface.
- **Don't** use emoji or Unicode glyphs as icons.
- **Don't** use X's name, bird mark or brand blue.
