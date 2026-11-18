# Study Forge UI/UX Audit

**Audit date:** 2026-11-17  
**Reviewed deployment:** [study-forge.pages.dev](https://study-forge.pages.dev/)  
**Scope:** Sign-in/landing screen and the guest dashboard reached through “Continue as Guest.” This is a review of the deployed experience, cross-checked against the corresponding source in `src/`. Study tools and secondary screens were not exhaustively audited.

## 1. Verdict

**4.6 / 10, app profile.** Study Forge has a recognizable visual identity and a functional set of learning destinations, but the current first-use journey makes the main study action hard to find, presents demo-like claims as live facts, and hides keyboard focus on the primary navigation. The dashboard is also overloaded: at 360 × 800, the measured page is about 8,609 CSS pixels tall, while the “Start Learning” button begins below the first screen. The user sees progress, a long announcement, and several system panels before reaching the central action.

The highest-priority repair is keyboard access: inactive sidebar buttons suppress their outline without supplying a visible focus treatment. Fix that before polishing motion or card decoration. Preserve the dark charcoal/orange identity, the clear guest-data warning, the 52px desktop navigation targets, and the empty-lessons message with its “Create Lesson” action. Those are the strongest foundations in this experience.

The score is intentionally modest. The app reads as a themed dashboard, but fine-print labels, low-contrast metadata, unlabelled icon controls, repeated announcement content, and unverified “live” metrics make it feel less trustworthy and less task-focused than its visual finish suggests.

## 2. Method & evidence tier

**Tier A (live browser) plus Tier B (source/static).** On 2026-11-17 I inspected the deployed sign-in screen and entered guest mode without submitting a form or authenticating. I captured the sign-in first screen and a 360 × 800 dashboard view; measured rendered layout and controls at 360 × 800, 768 × 900, 1280 × 900, and 1920 × 1080; reviewed the accessibility snapshot; and tabbed through the dashboard controls. The `ui-probe-critic` static probe fetched the page and stylesheets, but correctly identified the HTML response as a JavaScript shell. Its markup counts were therefore not treated as findings; CSS signals were checked against the rendered page and source.

**Profile:** `app`, because this is an interactive study dashboard with navigation, tasks, and repeated controls. Scores were calculated by `scripts/score.py`. **Confidence:** high for observed geometry, labels, keyboard focus, and source-backed issues; medium for inferred comprehension and task-priority impact. **Not verified:** real-device rendering, screen-reader speech, 200% text zoom, 400% page zoom, all forms' success/error states, reduced-motion rendering, authenticated flows, and Core Web Vitals. No performance numbers below are presented as measured.

## 3. Scorecard

| # | Dimension | Weight | Score | Justification |
|---|---|---:|---:|---|
| 1 | First impression & hierarchy | 9% | 5 | The dashboard has a strong “Start Learning” CTA, but at 360px it is below the first screen and competes with header actions and the announcement area. |
| 2 | Typography | 7% | 4.5 | Display type is distinctive; many operational labels are 8–10px, including status and task metadata. |
| 3 | Color & contrast | 7% | 4 | Accent orange is legible, but `text-white/20` on the dark surface computes to roughly 1.76:1—well below AA for text. |
| 4 | Layout, spacing & rhythm | 10% | 5 | The dashboard is responsive without measured horizontal overflow, but repeats large panels and makes users scroll through a very long page. |
| 5 | Components & affordances | 12% | 5 | Main actions look like buttons, but “Initialize Sync” has no action handler and several icon controls have no accessible name. |
| 6 | Navigation & IA | 10% | 5.5 | The sidebar exposes useful study destinations, but there are many peer choices, unclear labels, and an unnamed mobile menu control. |
| 7 | Motion & feedback | 5% | 4 | Motion adds character, but reduced-motion support was not found and the sign-in screen runs a continuous decorative particle loop. |
| 8 | Content & microcopy | 6% | 4.5 | The product purpose is broadly understandable; “Initialize Sync,” “Global Broadcast Matrix,” and “Google Backup” obscure familiar actions. |
| 9 | Accessibility | 12% | 3 | Keyboard focus is suppressed on inactive navigation buttons; sign-in fields lack visible labels and auth errors lack an announced status pattern. |
| 10 | Responsiveness & reflow | 5% | 5.5 | The measured document did not horizontally overflow at tested widths, but key labels and controls remain too small and the main action is delayed. |
| 11 | Performance & perceived speed | 6% | 5 | No Web Vitals were available. The long animated dashboard and repeated content create avoidable work and perceived weight. |
| 12 | Consistency & design system | 8% | 4.5 | The visual system is recognizable, but tiny text, mixed terminology, and numerous low-level CSS tokens reduce consistency. |
| 13 | Trust & polish | 1% | 3.5 | The page shows simulated activity as live, asserts precise performance metrics without context, and leaves a dated update prominent. |
| 14 | Distinctiveness & craft | 2% | 6.5 | The forge theme and orange accent are memorable; the same theme is often expressed through extra labels and effects rather than useful guidance. |

**Weighted:** 4.6 / 10 · **P0 defect listed:** F-01 · **Cap:** 6.0; it does not reduce the score because the weighted score is already below the cap · **Final:** 4.6 / 10.

## 4. What works

- **A coherent visual identity.** Charcoal surfaces, warm orange accents, flame imagery, and the “Study Forge” naming establish a specific product world. Keep the accent reserved for actions and meaningful status; avoid adding more decorative colors.
- **The guest warning is direct.** “Guest Mode: Progress is temporary. Log in to save your study data permanently.” communicates the consequence before users invest time. Keep that information, but replace the unexplained “Initialize Sync” action with a clearly named sign-in action.
- **The learning CTA has good visual weight.** “Start Learning” is a large, high-contrast button with a visible icon. Its issue is placement, not visual affordance: put it in the first mobile screen and make its destination clear.
- **The empty lessons state offers a next step.** “No Lessons Yet” is paired with “Create Lesson,” which turns an empty state into an action rather than a dead end.
- **The sidebar destinations are recognizable.** “Planner,” “Focus Timer,” “Flashcards,” “Quiz,” and “Lessons” map to familiar study tasks. Keep these plain-language names while simplifying their presentation.
- **The responsive shell has a useful baseline.** The page did not measure wider than the available document area at the tested viewport sizes. Keep the current single-column mobile behavior while fixing the priority and legibility issues below.

## 5. Findings

### P0 — Fix before the next release

> ### F-01 · Keyboard focus disappears on inactive navigation buttons
> **Severity:** P0 · **Type:** DEFECT · **Dimension:** 9 (Accessibility) · **Confidence:** High
>
> **Evidence.** On the guest dashboard, keyboard tabbing reached the sidebar items. The `Dashboard` button has `outline-none`; the inactive `Planner`, `Focus Timer`, `Flashcards`, `Match Game`, `Quiz`, `Community`, `Lessons`, `Study Guide`, `Library`, and `Feedback` buttons compute to `outline-style: none` and have no focus-specific ring or border change. Their default styles differ only in low-opacity text/background. Source: `src/App.tsx`, sidebar button classes.
>
> **Why it matters.** A keyboard user can move focus without being able to see which destination will activate. A persistent selected state is not a substitute for a distinct focus state, especially when focus moves to an inactive item.
>
> **Fix.**
> - Remove `outline-none` from sidebar buttons unless it is paired with a visible `:focus-visible` treatment.
> - Add a 2px solid focus ring with at least 3:1 contrast against the adjacent surface, offset by 2px. Apply the same rule to every icon-only and text button in the main shell.
> - Keep the current-page indicator separate from the keyboard focus indicator.
>
> **Acceptance.** Tab through every sidebar item at desktop and mobile widths. Each focused control has a persistent, clearly visible ring; pressing Enter or Space activates the focused destination; the ring does not disappear on pointer interaction.

### P1 — Fix this cycle

> ### F-02 · Sign-in fields rely on placeholders instead of visible labels
> **Severity:** P1 · **Type:** DEFECT · **Dimension:** 9 (Accessibility) · **Confidence:** High
>
> **Evidence.** The sign-in form shows `Email` and `Password` as placeholders inside two inputs. The source contains no `<label>`, `htmlFor`, or `autoComplete` attribute for these inputs (`src/components/LoginPage.tsx`). Their placeholder text disappears when users type, and browser/password-manager autofill receives no declared purpose.
>
> **Why it matters.** Users who forget the field purpose after entering data lose their visible cue. Placeholder-only controls also fail the visible-label expectation and weaken autofill support.
>
> **Fix.** Add persistent labels above each field, connect them with `htmlFor`/`id`, set `autoComplete="username"` (or `email`) and `autoComplete="current-password"`, and preserve the existing input styling.
>
> **Acceptance.** The labels remain visible with values present; clicking each label focuses its input; browser autofill recognizes email and current password; at 200% text zoom labels do not clip.

> ### F-03 · Mobile menu control has no accessible name
> **Severity:** P1 · **Type:** DEFECT · **Dimension:** 5 (Components & affordances) · **Confidence:** High
>
> **Evidence.** At 360px the header contains a 48 × 48 icon-only button. The browser accessibility snapshot exposes it as an unnamed `button`; it does not announce “Open navigation” or an equivalent label. The sidebar is moved off the left edge at this width.
>
> **Why it matters.** A screen-reader user cannot tell whether this button opens navigation, changes the layout, or performs another action. A menu glyph is visual evidence, not an accessible name.
>
> **Fix.** Add a state-aware accessible name (`Open navigation` / `Close navigation`) and `aria-expanded` plus `aria-controls` pointing to the sidebar. Ensure the mobile drawer closes after a destination is chosen and returns focus to the trigger.
>
> **Acceptance.** Screen readers announce the action and expanded state; keyboard users can open, navigate, close with Escape, and return focus; the menu remains operable at 360px.

> ### F-04 · Authentication errors are not exposed as status messages
> **Severity:** P1 · **Type:** DEFECT · **Dimension:** 9 (Accessibility) · **Confidence:** High
>
> **Evidence.** `LoginPage.tsx` conditionally renders `errorMsg` and `successMsg`, but the component has no `role="alert"`, `role="status"`, or `aria-live` attribute. This is source-verified; no authentication was submitted during the audit.
>
> **Why it matters.** When a login or password-reset request fails, a screen-reader user may not be notified that text appeared or learn what action to take next.
>
> **Fix.** Render errors in a persistent `role="alert"` region and non-urgent success messages in `role="status"` with `aria-live="polite"`. Associate field-specific errors with the relevant input through `aria-describedby`; do not move focus unnecessarily.
>
> **Acceptance.** Trigger invalid credentials and password-reset success/failure in a test environment. Each message is announced once, is visible, and remains associated with the relevant field.

> ### F-05 · “Initialize Sync” is a dead-end guest action
> **Severity:** P1 · **Type:** DEFECT · **Dimension:** 5 (Components & affordances) · **Confidence:** High
>
> **Evidence.** The guest banner says progress is temporary and offers a button labelled `Initialize Sync`. In `src/components/Dashboard.tsx` this button has no `onClick` handler, and the live page does not navigate or open a sign-in flow when it is activated.
>
> **Why it matters.** The user is told to protect their progress, then given a button that does nothing. That breaks the most important guest-to-account conversion path and undermines confidence in the rest of the interface.
>
> **Fix.** Replace the label with `Sign in to save progress` and connect it to the existing session-login flow. If account linking is not supported from guest mode, explain that and take the user to the supported sign-in route.
>
> **Acceptance.** Activating the banner action opens the correct authentication flow, preserves the current guest session where supported, and presents an explicit result or recoverable error.

> ### F-06 · The main study action is below the mobile first screen
> **Severity:** P1 · **Type:** DEFECT · **Dimension:** 1 (Hierarchy) · **Confidence:** High
>
> **Evidence.** At 360 × 800, the dashboard header and level bar precede the page heading, documentation/generator controls, guest banner, and hero. The measured `Start Learning` button begins around y=1,110px—below the initial viewport. The screenshot at 360 × 800 shows the user still in the header/intro stack, not at the central learning action.
>
> **Why it matters.** A first-time mobile user must scroll before reaching the product’s clearest task. In the first screen, `Lesson Generator`, the guest sync action, and floating controls compete for attention instead.
>
> **Fix.** Move `Start Learning` into the dashboard heading area or immediately below the guest banner. Reduce the vertical height of the level/progress header and defer supporting metrics until after the first task choice. Keep one primary CTA and make the generator a secondary action.
>
> **Acceptance.** At 360 × 800, the full primary CTA and a one-line explanation are visible without scrolling; a new guest can begin a study session within one tap from page load.

> ### F-07 · Repeated announcement content buries study tasks
> **Severity:** P1 · **Type:** DEFECT · **Dimension:** 4 (Layout, spacing & rhythm) · **Confidence:** High
>
> **Evidence.** The guest dashboard contains an `Activist Desk` announcement and later repeats the same `The Archivist's Desk` / `Update 2.0` content in its lower page. The login/landing view also shows an Archivist desk section. The rendered dashboard measures about 8,609px tall at 360px wide and 7,316px at 1280px wide.
>
> **Why it matters.** The repeated, long release note takes space away from current study work and makes the main dashboard feel like a news page. Repetition also makes the dashboard’s information architecture harder to scan.
>
> **Fix.** Keep one compact announcement card in a predictable location. Show only a short excerpt with a `Read update` link; move full release notes to a dedicated updates view. Remove the duplicate instance from the guest dashboard.
>
> **Acceptance.** The update appears once per dashboard session, the main study task is above the first scroll on mobile, and the full announcement remains reachable from a clearly named link.

> ### F-08 · “Live Activity” presents locally simulated events as real activity
> **Severity:** P1 · **Type:** DEFECT · **Dimension:** 13 (Trust & polish) · **Confidence:** High
>
> **Evidence.** The dashboard labels the panel `Live Activity` / `Real-time Academy Updates` and shows named people with minute-relative timestamps. `src/components/ForgeActivityFeed.tsx` seeds the feed with fixed examples and generates additional sample events locally; no live-feed source is connected in that component.
>
> **Why it matters.** Users can reasonably interpret the panel as activity from real students. Presenting generated examples as live social proof misstates what the product is doing.
>
> **Fix.** Connect the panel to real, permissioned activity data, or remove it from production. In demo builds, label it `Sample activity` and suppress real-time language and user-like claims.
>
> **Acceptance.** Each production item is traceable to a real event and respects privacy settings; demo data is visibly labelled as sample content and does not imply live users.

> ### F-09 · The dashboard advertises precision metrics without context
> **Severity:** P1 · **Type:** DEFECT · **Dimension:** 13 (Trust & polish) · **Confidence:** Medium
>
> **Evidence.** The hero displays `Accuracy 99.8%` and `Speed < 2.4s` beside `Start Learning`. The screen does not define the measured task, sample size, date, or source for either number; the corresponding spans are hard-coded in `src/components/Dashboard.tsx`.
>
> **Why it matters.** These figures read as product performance guarantees. Without a definition or evidence, they distract from the study flow and can set expectations the interface cannot substantiate.
>
> **Fix.** Remove both figures until they are backed by a documented metric. If retained, identify what was measured, the timeframe, and a link to methodology; use a qualitative product benefit instead of an unsupported decimal.
>
> **Acceptance.** Every displayed metric has a verifiable source and a plain-language definition, or the metric no longer appears in the hero.

> ### F-10 · The sign-in screen spends its first screen on branding, not access
> **Severity:** P1 · **Type:** DEFECT · **Dimension:** 1 (Hierarchy) · **Confidence:** Medium
>
> **Evidence.** The initial sign-in capture at 876 × 350 shows the large flame mark, `STUDY FORGE`, beta badge, and tagline; the authentication card starts below the visible first screen. Source styling adds 80px vertical page padding and a large responsive heading in `src/components/LoginPage.tsx`.
>
> **Why it matters.** Returning students arrive to authenticate, but the first viewport gives them no visible field or submit action. The strong identity treatment is useful; its height is not.
>
> **Fix.** Reduce the logo block’s vertical footprint and make the card begin near the top of the viewport. Keep the beta label secondary and place the tagline below the form or behind a smaller brand lockup.
>
> **Acceptance.** At 360 × 800 and 1280 × 800, returning students see the email field and primary sign-in button without scrolling; the brand remains visible without dominating the task.

> ### F-11 · Guest access exposes an internal asset-placeholder message
> **Severity:** P1 · **Type:** DEFECT · **Dimension:** 8 (Content & microcopy) · **Confidence:** High
>
> **Evidence.** The public login/landing page and guest dashboard expose `Visual Archive Empty` and `Add assets in Admin Panel` in the archive section.
>
> **Why it matters.** This is an authoring instruction, not useful information for students. It makes the public product look unfinished and asks users to understand an admin workflow they cannot use.
>
> **Fix.** Hide the archive section when it contains no public assets, or replace it with a student-facing empty state that explains what will appear and offers a relevant next action.
>
> **Acceptance.** A guest never sees admin-only setup language; empty content is either omitted or presented with a clear, user-relevant action.

> ### F-12 · Tiny, low-contrast labels make operational status hard to read
> **Severity:** P1 · **Type:** DEFECT · **Dimension:** 3 (Color & contrast) · **Confidence:** High
>
> **Evidence.** `Accuracy`, `Speed`, and other metadata use 8px `text-white/20` in `src/components/Dashboard.tsx`; the page’s base is `#0A0A0C`. Compositing 20%-opacity white over that base yields approximately `#3B3B3D`; the provided contrast tool measured **1.76:1** against `#0A0A0C`, below WCAG AA’s 4.5:1 for normal text. The exact local card surface can shift the ratio slightly, but not enough to pass.
>
> **Why it matters.** These labels communicate the meaning of nearby metrics. Their small size and weak contrast make them especially difficult for low-vision users and anyone viewing the interface on a dim or low-quality display.
>
> **Fix.** Raise operational text to at least 14px (16px for body copy) and use a foreground color that measures at least 4.5:1 on its actual surface. Keep opacity for decoration, not essential labels.
>
> **Acceptance.** Contrast-check visible text against the rendered card surface; all normal text passes 4.5:1 and remains readable at 200% text zoom.

### P2 — Fix this quarter

> ### F-13 · 8px labels and 10px navigation text are too small for routine use
> **Severity:** P2 · **Type:** DEFECT · **Dimension:** 2 (Typography) · **Confidence:** High
>
> **Evidence.** The live dashboard renders labels such as `Accuracy`, `Speed`, `Tasks`, `Study Tip`, and `Initialize Sync` at 8px. Sidebar destination text is 10px. `src/components/Dashboard.tsx`, `src/App.tsx`, and `src/components/ForgeActivityFeed.tsx` contain repeated 8px text classes.
>
> **Why it matters.** Uppercase tracking and a dark theme make these sizes harder to scan than the numeric CSS value alone suggests. They also create a large gap between dramatic headings and practical instructions.
>
> **Fix.** Define a small type scale: body 16px, secondary labels 14px, compact metadata no smaller than 12px. Keep large display type for headings and use sentence case for utility labels.
>
> **Acceptance.** No essential instruction, status, navigation label, or control text is below 12px; body copy is at least 16px at 360px width.

> ### F-14 · “Initialize Sync” is below minimum touch comfort
> **Severity:** P2 · **Type:** DEFECT · **Dimension:** 5 (Components & affordances) · **Confidence:** High
>
> **Evidence.** The guest-banner button measures approximately 50 × 24px at 360px and 77 × 12px at 1280px. The desktop target is below the WCAG 2.2 24px minimum height and well below a comfortable 44px touch target.
>
> **Why it matters.** Small targets are easy to miss and difficult to activate accurately, particularly on touch devices. The present label is also too small to read comfortably.
>
> **Fix.** After correcting the action in F-05, give it at least 44px height and 12px horizontal padding; preserve adequate spacing from adjacent controls.
>
> **Acceptance.** The clickable area measures at least 44 × 44 CSS px on touch layouts and at least 24 × 24px on desktop, with no overlapping hit areas.

> ### F-15 · The dashboard uses product lore where task language should lead
> **Severity:** P2 · **Type:** TASTE · **Dimension:** 8 (Content & microcopy) · **Confidence:** High
>
> **Evidence.** First-use copy includes `Activist Desk`, `Global Broadcast Matrix`, `Forge OS 3.1 Online`, `System ready for data ingestion`, and `Initialize Sync`. The top navigation and page title otherwise use plain study terms such as `Planner`, `Quiz`, and `Lessons`.
>
> **Why it matters.** The themed language is distinctive, but it does not consistently name the action or content. Users must translate the product’s internal vocabulary before deciding what to do.
>
> **Fix.** Keep the forge metaphor in illustrations and section accents; use task language for controls and headings. Rewrite `Activist Desk` as `Updates`, `Initialize Sync` as `Sign in to save progress`, and `data ingestion` as `Add study materials`.
>
> **Acceptance.** A first-time student can identify each section’s purpose from its heading alone; keep at most one theme-specific term in a task label.

> ### F-16 · The public update is dated and overly long
> **Severity:** P2 · **Type:** DEFECT · **Dimension:** 8 (Content & microcopy) · **Confidence:** High
>
> **Evidence.** The announcement card is dated `5/17/2026` and contains a long release-note paragraph covering multiple sections. The audit date is 2026-11-17, so this is six months old. The numeric date is also locale-ambiguous.
>
> **Why it matters.** A prominent, old announcement can make the product appear inactive; a long block of release notes interrupts the task-oriented dashboard.
>
> **Fix.** Show only the current announcement, use an unambiguous date such as `May 17, 2026`, and move the full history to a changelog. If there is no current update, collapse the card.
>
> **Acceptance.** The dashboard shows no stale announcement as current; date format is unambiguous; a release note excerpt is under two short lines on mobile.

> ### F-17 · Continuous decorative animation has no reduced-motion alternative
> **Severity:** P2 · **Type:** DEFECT · **Dimension:** 7 (Motion & feedback) · **Confidence:** High
>
> **Evidence.** The sign-in component adds animated sparks on a 400ms interval; the dashboard uses pulsing and other motion effects. The stylesheet probe found no `prefers-reduced-motion` rule in the loaded CSS.
>
> **Why it matters.** People who request reduced motion still receive repeated movement. The particles do not explain a state change or help complete sign-in.
>
> **Fix.** Add a `prefers-reduced-motion: reduce` rule that disables ambient motion and transitions. Gate the sign-in particle loop on the preference and remove it entirely if it does not communicate useful state.
>
> **Acceptance.** With reduced motion enabled, ambient animation stops; functional transitions remain brief and do not block access to controls.

> ### F-18 · Mobile fixed helpers compete with page content
> **Severity:** P2 · **Type:** DEFECT · **Dimension:** 4 (Layout, spacing & rhythm) · **Confidence:** Medium
>
> **Evidence.** The 360 × 800 screenshot shows multiple fixed circular helper controls stacked at the lower-right, over the scrollable dashboard. Their positions remain fixed while the dashboard content moves beneath them.
>
> **Why it matters.** Fixed overlays consume scarce mobile space and can cover useful copy or actions, especially when the page is already dense.
>
> **Fix.** Consolidate secondary help and mission links under one labelled support control, or dock them in a non-overlapping bottom bar with safe-area padding. Hide non-essential helpers while a modal or focused action is active.
>
> **Acceptance.** At 360px, no fixed control obscures text, fields, or primary actions while scrolling; controls respect device safe areas and can be dismissed.

> ### F-19 · “Google Backup” mislabels the sign-in provider
> **Severity:** P2 · **Type:** DEFECT · **Dimension:** 8 (Content & microcopy) · **Confidence:** High
>
> **Evidence.** The sign-in screen introduces the provider action with `Or Sign In With`, then labels its button `Google Backup`.
>
> **Why it matters.** “Backup” describes data recovery, not authentication. Users may infer that this action is secondary, a backup mechanism, or unrelated to account creation.
>
> **Fix.** Rename the control `Continue with Google` and use the same provider wording for login and registration.
>
> **Acceptance.** The label describes the action in the same terms in every auth mode and matches the provider identity.

> ### F-20 · Some carousel controls are icon-only and unnamed
> **Severity:** P2 · **Type:** DEFECT · **Dimension:** 5 (Components & affordances) · **Confidence:** High
>
> **Evidence.** In the live accessibility snapshot, the announcement carousel exposes adjacent buttons without names. Their visible content is only an icon/dot, with no announced previous/next purpose.
>
> **Why it matters.** Screen-reader users cannot tell what these buttons do, and sighted users receive no textual explanation of which announcement they will reach.
>
> **Fix.** Add `aria-label="Previous update"` and `aria-label="Next update"` to directional controls; if the controls are pagination dots, name each with its position and update title. Mark decorative icons as hidden from the accessibility tree.
>
> **Acceptance.** Every carousel control has a unique accessible name and its activation changes the visible update; keyboard focus remains visible.

> ### F-21 · The desktop navigation presents too many equal-weight destinations
> **Severity:** P2 · **Type:** TASTE · **Dimension:** 6 (Navigation & IA) · **Confidence:** Medium
>
> **Evidence.** The sidebar presents eleven destinations—Dashboard, Planner, Focus Timer, Flashcards, Match Game, Quiz, Community, Lessons, Study Guide, Library, and Feedback—with similar typographic treatment and 52px-high rows.
>
> **Why it matters.** The breadth is useful, but a first-time student is offered many peer choices before the core study path is established. The dashboard also adds separate generator and documentation actions.
>
> **Fix.** Keep the main study loop in the primary group (Dashboard, Lessons, Flashcards, Quiz, Timer); group Community, Library, and Feedback under a clearly named secondary section. Do not remove destinations—reduce their competition.
>
> **Acceptance.** A new guest sees a short primary navigation group and can still reach every secondary destination in one additional, clearly labelled action.

> ### F-22 · The loaded experience uses many one-off visual tokens
> **Severity:** P2 · **Type:** TASTE · **Dimension:** 12 (Consistency & design system) · **Confidence:** Medium
>
> **Evidence.** The static probe detected 85 distinct color values, 78 CSS font-size values, and 11 spacing values in the fetched stylesheet. This includes third-party/math-rendering CSS, so the counts are a lead rather than a precise count of the hand-authored UI; the rendered app also visibly mixes 8px metadata, 10px navigation, 14px body-like text, and 30–72px headings.
>
> **Why it matters.** One-off scales make later improvements harder to apply consistently and make the dashboard feel like a collection of independently styled panels.
>
> **Fix.** Establish semantic tokens for text, surface, border, spacing, radii, and type. Scope third-party KaTeX tokens out of the audit count; migrate the dashboard’s repeated labels and card styles to the shared scale.
>
> **Acceptance.** Hand-authored dashboard UI uses a documented type scale, spacing scale, and neutral/accent palette; exceptions are named and purposeful.

## 6. Dimension deep dives

### Hierarchy and information load

The dashboard’s core action is visible and well-styled, but it does not arrive soon enough. On a 360px-wide screen, the user must pass the top shell, XP/level panel, dashboard heading, documentation and lesson-generator buttons, guest banner, and the start of the hero before `Start Learning`. The hero is still useful; the sequence before it is not. F-06 and F-07 share a root issue: secondary system content is taking first-screen priority over the study task. The fix is structural, not a new color or animation—put one clear action first, move metrics and announcements lower, and remove duplicate release content.

### Accessibility and control feedback

The shell already uses navigation and main landmarks, and the page has a document title and language declaration. Those are good foundations. But the lack of focus styling on the sidebar is a critical break in keyboard navigation (F-01). The sign-in fields are visually clear once recognized, but placeholder-only labels and unannounced authentication errors make the flow fragile for assistive-technology users (F-02, F-04). Treat focus, labels, and status announcements as shared component requirements; do not fix them only on the dashboard.

### Typography and contrast

The display type conveys personality; the operational type does not consistently support reading. 8px labels are used for numbers and task metadata, while their low-opacity white treatment fails contrast. These defects compound: increasing brightness alone would not make 8px copy comfortable, and increasing size alone would not fix a 1.76:1 contrast ratio. F-12 and F-13 therefore need both a legible type scale and measured foreground tokens.

### Trust and content

The strongest credibility problem is not the visual style: it is the implication that generated demo activity is live. The `Live Activity` panel uses time-relative labels and real-person-like names, while the source seeds and generates the entries locally (F-08). The hard-coded performance numbers and old announcement reinforce that gap (F-09, F-16). Keep the style; make claims match the actual data.

## 7. State & responsive matrix

| Element | default | hover | focus-visible | active | disabled | loading | error |
|---|---|---|---|---|---|---|---|
| Sign-in email/password | ✓ observed | not verified | border/ring styles declared; not keyboard-verified | not verified | not verified | not verified | source has message text; announcement not verified |
| Sidebar destinations | ✓ observed | styles declared; not verified | **✗ inactive nav outline suppressed** (F-01) | selected item visible | n/a | n/a | n/a |
| Mobile menu | ✓ 48 × 48 icon button | not verified | not fully verified | not verified | n/a | n/a | n/a |
| Start Learning | ✓ visible on dashboard below fold | not verified | generic browser focus observed; full ring not visually verified | not verified | n/a | not verified | n/a |
| Guest sync action | ✓ visible | not verified | not verified | no meaningful outcome observed | n/a | n/a | n/a |
| Update carousel | ✓ observed | not verified | not verified | buttons unnamed in accessibility snapshot | n/a | n/a | n/a |

| Width | Result | Issues |
|---|---|---|
| 360 | Measured document width matches its available content width; no horizontal overflow measured. Dashboard is about 8,609px tall. | Main CTA is below the first 800px; labels and metadata are tiny; fixed helpers compete with content; unnamed menu button. |
| 768 | No horizontal overflow measured; major heading styles remain large. | Intermediate layout was measured, not screenshot-verified; hierarchy and tiny metadata issues remain. |
| 1280 | No horizontal overflow measured; dashboard content occupies the main canvas beside the sidebar. | Dashboard is about 7,316px tall; low-contrast metadata and keyboard focus issue remain. |
| 1920 | No horizontal overflow measured; main content expands with the viewport. | Full-page visual balance and text measure were not screenshot-verified at this width. |

## 8. Accessibility audit

| Criterion | Level | Result | Finding |
|---|---|---|---|
| 1.3.1 Info and Relationships | A | Partial: `main` and navigation landmarks present; sign-in fields lack explicit labels | F-02 |
| 1.3.5 Identify Input Purpose | AA | Fail: `autocomplete` attributes absent on sign-in fields | F-02 |
| 1.4.3 Contrast (Minimum) | AA | Fail: approximately 1.76:1 for 8px, 20%-opacity white metadata on the dark base | F-12 |
| 1.4.4 Resize Text | AA | Not verified | — |
| 1.4.10 Reflow | AA | Pass at measured widths for horizontal overflow; zoom/reflow not tested | — |
| 2.1.1 Keyboard | A | Partial: tab reaches navigation; visible focus fails on inactive sidebar buttons | F-01 |
| 2.4.2 Page Titled | A | Pass: `Study Forge \| Academic Excellence` | — |
| 2.4.3 Focus Order | A | Partial: tab order observed; mobile drawer behavior not fully tested | F-01, F-03 |
| 2.4.7 Focus Visible | AA | Fail for inactive sidebar buttons | F-01 |
| 2.5.8 Target Size (Minimum) | AA | Fail: `Initialize Sync` measured as low as 77 × 12px | F-14 |
| 3.3.1 Error Identification | A | Error copy exists in source; rendered error state not tested | F-04 |
| 3.3.2 Labels or Instructions | A | Fail: email/password rely on placeholders | F-02 |
| 4.1.2 Name, Role, Value | A | Fail: mobile menu and carousel controls have no accessible names | F-03, F-20 |
| 4.1.3 Status Messages | AA | Fail in source pattern: auth error/success content has no live-region semantics | F-04 |

**Keyboard-only:** inactive sidebar destinations can receive focus without a visible focus indicator. The mobile menu control and announcement controls do not have descriptive names. **Screen reader:** the snapshot exposes navigation and main landmarks, but the mobile menu and carousel buttons are unnamed; sign-in errors and success states do not declare live announcement semantics. **Low vision:** 8px text at low contrast is difficult to read; 200% text zoom and 400% page zoom were not tested. **Reduced motion:** no `prefers-reduced-motion` stylesheet rule was found; actual device preference behavior was not verified.

## 9. Performance & perceived speed

No Core Web Vitals, lab timing, or device performance measurements were available, so this report does not claim an LCP, CLS, or INP result. The static probe fetched a 220KB stylesheet and found several font-face declarations; the rendered experience uses remote fonts and substantial animation. Those facts are not enough to conclude that the app is slow.

The clearest perceived-speed issue is visual work before useful work: the dashboard has a long stack of panels and announcement content before the main study action, especially on mobile. The login screen also continuously adds decorative particles on a 400ms interval in source. Remove duplicated content and non-informative animation before optimizing assets. Measure the first meaningful dashboard action and actual Web Vitals on a representative low-end mobile device after those changes.

## 10. Content & microcopy rewrites

| Location | Current | Problem | Rewrite |
|---|---|---|---|
| Guest banner action | “Initialize Sync” | Technical and currently has no action | “Sign in to save progress” |
| Mobile navigation control | Icon only | Action is unnamed to assistive technology | Accessible name: “Open navigation” / “Close navigation” |
| Provider action | “Google Backup” | Suggests data backup instead of sign-in | “Continue with Google” |
| Archive section | “Visual Archive Empty / Add assets in Admin Panel” | Exposes internal setup instructions to students | Hide when empty, or “No featured study resources yet.” |
| Hero metrics | “Accuracy 99.8% / Speed < 2.4s” | No definition or evidence | Remove until substantiated; replace with a specific user benefit |
| Activity feed | “Live Activity / Real-time Academy Updates” | Feed is locally simulated | “Sample activity” in demo, or real permissioned events |
| Announcement heading | “Activist Desk / Global Broadcast Matrix” | Internal lore obscures the purpose | “Study Forge updates” |
| Hero description | “Our AI analyzes your materials…” | Broad benefit; does not name the immediate input/action | “Add your notes or choose a topic to create a study session.” |
| Sign-in error | “Unable to recognize these credentials…” | Generic and may not guide recovery | “Email or password doesn’t match. Check your details or reset your password.” |
| Update date | “5/17/2026” | Locale-ambiguous and stale in the current prominent card | “May 17, 2026” in a dated changelog entry |

## 11. Prioritized roadmap

| # | Fix | Findings | Impact | Effort | When |
|---|---|---|---|---|---|
| 1 | Add consistent keyboard focus-visible styles across the app shell | F-01 | High | S | Now |
| 2 | Label sign-in fields and announce authentication status | F-02, F-04 | High | S | Now |
| 3 | Name the mobile menu and carousel controls | F-03, F-20 | High | S | Now |
| 4 | Wire guest save action to sign-in | F-05 | High | S | Now |
| 5 | Move the primary learning action into the mobile first screen | F-06 | High | M | Now |
| 6 | Remove or clearly label simulated activity and remove unsupported metrics | F-08, F-09 | High | S | Now |
| 7 | Remove duplicate announcement and internal archive placeholder copy | F-07, F-11 | High | S | Next |
| 8 | Replace tiny/low-contrast UI text with semantic type/color tokens | F-12, F-13, F-22 | High | M | Next |
| 9 | Reduce fixed helpers and add reduced-motion behavior | F-17, F-18 | Medium | M | Next |
| 10 | Simplify utility labels and date/update presentation | F-15, F-16, F-19 | Medium | S | Next |
| 11 | Group secondary navigation without removing destinations | F-21 | Medium | M | Later |

**If you only do three things:** make keyboard focus unmistakable, put “Start Learning” above the mobile fold, and stop presenting simulated activity or unsupported metrics as real. Then add field labels and make the guest-save action work.

## 12. Redesign direction

**Direction A — “Study first” (recommended).** Make the dashboard a task launcher, not a system-status wall. Keep the charcoal/orange palette and the existing learning modules, but use a compact header with the page title, one progress summary, and one primary `Start a study session` action. Put planner, review, quiz, and focus timer in a small set of task cards. Move announcements, community activity, and the archive below the task area or into dedicated destinations. The benefit is immediate comprehension for new guests; the risk is less room for the cinematic hero. This is the best fit for a study product because the first screen should help a student begin, not explain the product’s internal world.

**Direction B — “Quiet command center.”** Keep the sidebar and progress tracking, but reduce decoration and display type. Use a consistent 16px body / 14px secondary / 12px metadata scale, surface cards with clear borders, and color only for action, progress, and feedback. Preserve the level/streak mechanic while making the actual study task the highest-contrast control. The risk is that some of the forge personality becomes less prominent; the benefit is better scan speed and better contrast discipline.

**Direction C — “Guided first session.”** For first-time guests, replace the dense dashboard with three steps: choose a subject, select or add materials, begin a study mode. Keep the full dashboard available to returning users after a session is created. This gives a new student one obvious route and provides a natural place to explain what AI generation does. The risk is extra onboarding maintenance and an additional step for returning students; use it only if first-session completion is a product priority.

**Recommended:** Direction A, followed by selected parts of B. It preserves current structure and identity while correcting the root issue: the most useful study action currently appears after too much secondary content. Do not redesign the entire visual language before fixing the mobile first screen, focus states, and misleading demo content.

## 13. Re-test plan

After F-01, keyboard-tab through every navigation and floating control at 360px and 1280px. Close F-02/F-04 by running login, invalid-credential, password-reset, and registration states with a screen reader and verifying field labels and announcements. For F-03/F-20, verify menu open/close, Escape handling, focus return, and meaningful accessible names. Confirm F-05 takes a guest into the supported account-save flow.

Re-capture the first screen at 360 × 800 and 1280 × 900 after F-06/F-07. Done means the primary action is entirely visible on mobile, the announcement appears once, and the user can begin studying without passing a long release note. Re-run contrast checks on the final rendered text/surface pairs; all normal text must reach 4.5:1, and essential labels must be at least 12px. Test 200% text zoom, 400% page zoom, and `prefers-reduced-motion: reduce`. Measure real-device LCP/CLS/INP only after the layout changes. A rerun should close the P0 and P1 items before cosmetic polish is considered complete.

## 14. Appendix

### Evidence index

- Live sign-in page and public update content: [study-forge.pages.dev](https://study-forge.pages.dev/)
- Live guest dashboard: reached using the page’s `Continue as Guest` action.
- Dashboard source: [`src/components/Dashboard.tsx`](./src/components/Dashboard.tsx)
- Sidebar and shell source: [`src/App.tsx`](./src/App.tsx)
- Sign-in source: [`src/components/LoginPage.tsx`](./src/components/LoginPage.tsx)
- Seeded/generated activity source: [`src/components/ForgeActivityFeed.tsx`](./src/components/ForgeActivityFeed.tsx)
- Global styles: [`src/index.css`](./src/index.css)
- Static probe: `ui-probe-critic/scripts/probe_site.py` (Tier B; its DOM metrics describe the JS shell only).
- Scoring tool: `ui-probe-critic/scripts/score.py`, `--profile app`; score table above is its output.
- Contrast calculation: `ui-probe-critic/scripts/color_tools.py contrast '#3B3B3D' '#0A0A0C' --size 8` → **1.76:1, AA fail**.

### Finding index

| ID | Topic | Severity |
|---|---|---|
| F-01 | Invisible keyboard focus in sidebar | P0 |
| F-02 | Placeholder-only sign-in fields; no autofill purpose | P1 |
| F-03 | Unnamed mobile menu control | P1 |
| F-04 | Authentication messages not announced | P1 |
| F-05 | Dead guest sync action | P1 |
| F-06 | Primary study action below mobile first screen | P1 |
| F-07 | Duplicate announcement content and excessive page length | P1 |
| F-08 | Simulated activity presented as live | P1 |
| F-09 | Unsubstantiated dashboard metrics | P1 |
| F-10 | Login branding pushes sign-in controls below first screen | P1 |
| F-11 | Admin placeholder exposed to guests | P1 |
| F-12 | Low-contrast essential metadata | P1 |
| F-13 | Essential labels are too small | P2 |
| F-14 | Guest sync target is too small | P2 |
| F-15 | Product lore obscures task language | P2 |
| F-16 | Stale and locale-ambiguous update date | P2 |
| F-17 | No reduced-motion alternative | P2 |
| F-18 | Fixed mobile helpers compete with content | P2 |
| F-19 | Misleading “Google Backup” provider label | P2 |
| F-20 | Unnamed announcement carousel controls | P2 |
| F-21 | Too many equal-weight navigation destinations | P2 |
| F-22 | One-off visual tokens weaken consistency | P2 |

**Tools:** browser accessibility snapshot, browser screenshots, Playwright viewport/DOM measurements, `ui-probe-critic` static probe, `color_tools.py`, and `score.py`. No UI states were submitted to an external account; no authentication credentials were used.
