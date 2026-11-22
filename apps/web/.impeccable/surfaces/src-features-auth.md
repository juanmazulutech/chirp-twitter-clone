---
version: 1
slug: "src-features-auth"
primary_target: "src/features/auth/pages/LoginPage.tsx"
related_targets: ["src/features/auth/pages/RegisterPage.tsx", "src/features/auth/components/AuthLayout.tsx"]
---

# Signed-out surfaces (sign in, create account)

Scope: the two screens a visitor sees before having a session. Visitor mode: Operate (the task is getting in). Audience, job and constraints: see PRODUCT.md; reviewers of the project arrive here first and sign in with the demo account. Structure: one column of form, no concept round (author's decision, C19).

## Direction contract

THESIS: Getting in is one calm, obvious step: a single column on the airmail sheet that asks only what it needs and says plainly what went wrong. Refuses the category default of a split hero with marketing art beside the form.

OWN-WORLD: The app's own frame: the sheet header with the wordmark and the one red-and-blue chevron beneath it, paper ground, navy ink, Archivo. Airmail red only on the primary action ("Sign in", "Create account"); airmail blue for links and focus; errors in danger with an icon and words.

STORY: The visitor understands this is Chirp, signs in (or fills in the demo account with one press and signs in), and lands on their timeline; a new visitor creates an account and lands on search to find people.

FIRST VIEWPORT: Phone 390: 56px sheet header with the wordmark; chevron; "Sign in to Chirp" headline; Email and Password fields (password with a show toggle); red full-width "Sign in"; secondary "Use the demo account"; hairline; "New to Chirp? Create an account". All above the fold. Desktop: the same column, 28rem wide, as one bordered sheet on the paper, 48px below the header.

FORM: Single-column form on the established Postmarked world; seed: none (pinned) — "sin ronda" (author, C19: no concept round).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
