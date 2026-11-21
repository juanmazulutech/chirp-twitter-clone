---
version: 1
slug: "src-app-routes-tsx"
primary_target: "src/app/routes.tsx"
related_targets: ["src/styles.css"]
---

# App surfaces (shell, timeline, profiles)

Scope: every signed-in screen of the web app, starting with the design tokens, UI primitives and the home timeline. Visitor mode: Operate. Audience, job and constraints: see PRODUCT.md. Layout stays the familiar social-app shell (author's pin: X-like structure, own brand).

## Direction contract

THESIS: Every chirp is a letter from someone you chose, stamped with the moment it was sent. Refuses the category default: a white feed with one blue accent where relative "2m" labels are the only sense of time.

OWN-WORLD: Airmail paper ground (blue-tinted white) with navy ink; airmail red reserved for the one primary action; airmail blue for links, selection and focus. One red-and-blue chevron hairline under the header is the only edging. Time is a postmark ring. Archivo with tabular figures. Hairline dividers, no decorative shadows. Night: a navy envelope ground with paper-tinted ink, the same red and blue lifted to AA.

STORY: The visitor sees the people they follow, newest first, each chirp postmarked with its time; understands the feed is theirs and in order; chirps with the red button.

FIRST VIEWPORT: Phone 390: 56px header (avatar, wordmark); chevron hairline; "Home / People you follow"; chirp rows (44px avatar, name and handle, text, actions) with a 54px postmark ring top right; red "Chirp" button bottom right above a 64px bottom nav. Desktop: labelled left rail, 600px feed, right search panel.

FORM: Postmarked (airmail correspondence); position 1 of the ordered list, chosen by the author as the pick over the rolled direction; seed:35754ad4ba978784.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Icon set (chosen with the app shell in C17).
- Exact night palette values are resolved in the build and documented in DESIGN.md.
