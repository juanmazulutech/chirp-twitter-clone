# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who share short updates and follow others, mostly from a phone browser and sometimes from a laptop. Their job is to keep up with the people they chose to follow and to post quick thoughts, links and photos without friction. Reviewers of the project use it exactly as such a user would: sign up or sign in with a demo account, read the timeline, post, follow, like and search.

## Product Purpose

Chirp is a microblogging app: short posts ("chirps", up to 280 characters), a home timeline of the people you follow, likes, follows and user search. Success means a new user can sign up, find people, follow them and read a timeline that is entirely theirs within a minute, on a phone, without instructions.

## Positioning

A calm, chronological microblog. The home timeline shows only the people you follow, newest first: no ranking algorithm, no recommended posts injected into the feed, no ads and no engagement-bait metrics. What you see is what the people you chose posted, in the order they posted it.

## Operating Context

- Used in mobile browsers first (bottom navigation, one-handed reach), scaling up to tablet and desktop.
- The interaction model follows the familiar X/Twitter structure (timeline, composer, profile, follow lists), so people need no onboarding.
- A seeded community of twelve personas makes the product populated from the first sign-in; the demo account is `demo@chirp.dev`.
- Built and evaluated as a technical challenge: every flow must work end to end from a fresh clone.

## Capabilities and Constraints

- Accounts: sign up (email, username, display name, password), sign in, sign out; sessions persist across reloads.
- Chirps: create (1–280 Unicode code points, counted as the user sees them, emoji included), delete your own, optional image attachment.
- Social: follow / unfollow, like / unlike with visible counts, followers and following lists, user search by name or username, notifications for new followers and likes.
- Profiles: unique username (3–15 lowercase letters, digits or underscores), display name (up to 50 characters), bio (up to 160), avatar with an initials fallback.
- Terminology: the interface calls posts "chirps" and the action "chirp" ("Chirp", "Delete chirp"); the code and API call them tweets.
- Out of scope: replies and threads, reposts, direct messages, real-time updates, email verification, password reset.

## Brand Commitments

- Name: **Chirp**. Its own identity: never X's name, logo, bird mark or brand blue.
- Voice: warm and brief, with a light touch of personality. Short sentences, plain words, helpful empty states ("Nothing here yet — follow someone to fill your timeline"). "Chirp" is used consistently as noun and verb; bird puns are rare, never in errors.
- Errors say what happened and what to do next; they never blame the user.

## Evidence on Hand

- Seed personas with names, usernames and bios: `apps/api/prisma/seed-data/users.ts`. Persona-matched chirps, follows and likes are added as those features land.
- Illustrated seed avatars (DiceBear, CC0) are planned; until then avatars fall back to initials.
- There are no real users, testimonials, usage metrics, press or customers. Never fabricate them.

## Product Principles

1. **Your timeline is yours.** Only accounts you follow, strictly chronological; nothing is injected or reordered.
2. **Posting is effortless.** The composer is one tap away on every screen, and limits are shown before they are hit.
3. **Familiar first.** Use the patterns people already know from social apps; differentiate through calm and clarity, not novel interactions.
4. **Instant feedback.** Likes and follows respond immediately and reconcile quietly with the server.
5. **Small screens lead.** Every flow is designed for a phone first and must remain fully usable at 320px wide.

## Accessibility & Inclusion

- WCAG 2.2 AA: contrast, visible focus, labelled controls, full keyboard operation.
- Toggles (like, follow) expose their state (`aria-pressed`); counts and new content are announced without stealing focus.
- Respect `prefers-reduced-motion` and `prefers-color-scheme` (light and dark).
- Character limits count code points, so emoji and accented names behave as users expect.
