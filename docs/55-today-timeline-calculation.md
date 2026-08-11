# Today Timeline and Calculation Breakdown

**Task:** `WL-404`  
**Completed:** 2026-08-11  
**Outcome:** Complete locally. Today now explains the provisional daily arithmetic as three
source-to-result groups and presents immutable attendance events as a responsive ordered history
with explicit organization-local date, timezone, event meaning, and same-time ordering context.

## Existing data boundary preserved

`WL-401` already supplied the strict, minimized Today response needed for this experience. This
slice does not add a second calculation, change the API contract, expand database access, or expose
new identity/source fields. The browser continues to display the server-provided integer-minute
amounts and ordered immutable events; it never derives an authoritative total or reorders source
facts.

Formatting is isolated to locale-aware date/time display and signed hours-and-minutes labels. It
uses the explicit response timezone for event instants and performs no JavaScript `Date` arithmetic.

## Explainable calculation

The focused `DailyTimeBreakdown` component keeps status and source amounts in reading order:

1. **Expected time** shows scheduled time, public-holiday reduction, absence reduction, and the
   server-provided expected total.
2. **Credited time** shows worked time, break time, absence credit, signed approved adjustments,
   and the server-provided credited total. Its copy states that break time is already excluded from
   worked time and is not subtracted again.
3. **Estimated balance** shows credited time, expected time, and the signed server-provided balance.

Each group uses a heading and description list, followed by a natural-language equation that names
the operands and result. Positive, zero, and negative adjustments remain explicit without creating
an awkward “plus negative” phrase. The current day remains labelled `PROVISIONAL` or `INCOMPLETE`;
the presentation never calls it posted, locked, final, payable, or payroll overtime.

When expected time is zero, an explanation appears before the groups. A named holiday explains its
reduction to zero; otherwise the schedule/reduction result is stated generically. Recorded work is
described as separately credited rather than celebrated or classified as overtime.

## Ordered event history

The focused `TodayAttendanceTimeline` component uses one semantic ordered list. Every item contains:

- the stable user-facing event label;
- a short meaning such as work-session start, working-time pause/resume, or session end; and
- a semantic `<time>` using the trusted event instant formatted in the response timezone.

The section states the organization-local date, IANA timezone, event count, immutable source
character, and recorded-order rule. Events sharing one occurrence time remain in response order,
which preserves the confirmed active-break `BREAK_END` then `CLOCK_OUT` sequence. Decorative markers
are hidden from assistive technology. Empty and truncated histories retain their existing explicit
text and blocker meaning.

## Semantic and responsive guidance

Modern Web Guidance's HTML and CSS-layout guides were applied with the repository's Baseline 2024
target: native headings, ordered lists, description lists, natural DOM order, intrinsic grid sizing,
flex wrapping, and no custom keyboard model or unnecessary ARIA. No chart, disclosure, horizontal
data scroller, JavaScript measurement, package, or experimental layout feature was added.

The Today content is capped at a readable wide-screen measure. Calculation groups use an intrinsic
`auto-fit`/`minmax()` grid and stack in source order. Timeline rows wrap label/time content without
reordering it. Responsive QA found and fixed one existing min-content edge: a long holiday name
could widen the Today summary grid at 320 px. Grid children now explicitly shrink and the label can
wrap anywhere without hiding content.

Automated Chromium evidence covers 320 px reflow and the existing 390 px/mobile and desktop paths.
Temporary visual review at 320 px and 1280 px confirmed the grouped cards, long-label wrapping, and
event rows remain readable. Actual browser-zoom, translated-content, ultra-wide, forced-colors, and
screen-reader manual passes remain part of the phase-wide `WL-406` review.

## Verification evidence

- Component tests verify the three named groups, exact natural-language formulas, negative signed
  adjustment presentation, break-time explanation, zero-expected holiday explanation, ordered
  same-time events, timezone context, empty/incomplete states, and axe.
- Chromium verifies the complete command path still works, the explanation/history remain usable
  at a 320 px CSS viewport with a long holiday name, no horizontal page overflow occurs, and axe
  passes.
- Source-boundary evidence is updated for the extracted formatter and two focused components.
- The database-enabled canonical gate passes 24 native checks, 149 unit/component tests,
  21 integration tests, six Chromium scenarios, reproducible OpenAPI, formatting,
  lint/boundaries, strict TypeScript, and the production build.

## Deferred ownership

- `WL-405` owns lost-response retry, offline/reconnect behavior, duplicate/replay presentation,
  stale tabs/devices, polling, and broader dependency-error recovery.
- `WL-406` owns the phase-wide manual keyboard, screen-reader, touch, 200% zoom/reflow,
  forced-colors, reduced-motion, long/translated-text, and additional viewport review.
- `WL-1001` owns measured large-history performance and any justified archival, pagination,
  virtualization, or bundle-splitting work. The current Today source remains bounded at 500 events.
