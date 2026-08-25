# Phase 13 — Attendance clarity, operational trust, and workflow usability hardening

## Objective

Turn the Phase 12 implementation into a cognitively clear, trustworthy, and production-ready experience. Prioritize the core attendance workflow before touching secondary manager and administration surfaces. Separate current attendance, today’s progress, and posted time-account information; remove contradictory values and false warnings; make recovery actions obvious; then apply the same clarity standards to approvals, team status, employee administration, navigation, and dense responsive layouts.

## Dependencies

- Phase 12 is complete and all workspace manifests are at `0.13.0`.
- Existing domain rules, immutable attendance history, ledger behavior, permissions, and API contracts remain authoritative.
- `references/today-redesign-reference.png` is available in the repository as a visual hierarchy reference.

## Deliverables

- One coherent Today attendance snapshot and display contract.
- Revised Today information architecture and responsive implementation.
- Complete attendance-state and clock-action feedback matrix.
- Clear separation of current session, daily progress, provisional difference, and posted flex-time balance.
- Actionable warning and recovery patterns.
- Improved timeline and calculation disclosure.
- Streamlined manager Approval inbox and Team status workflows.
- Clearer employee and team administration surfaces.
- Cross-route navigation, microcopy, focus, overflow, and responsive consistency.
- Deterministic visual, integration, usability, and accessibility regression coverage.
- Updated screenshots, product documentation, status files, and release notes.

## Exit gate

Phase 13 passes when:

- [ ] Every value on Today comes from one coherent server snapshot and all visible times reconcile.
- [ ] A first-time employee can identify current state, session start, worked time, remaining time, next action, and any real problem without opening a secondary panel.
- [ ] An in-progress day is not presented as posted flex-time debt.
- [ ] Posted flex-time balance is dated and visually separated from current-day progress.
- [ ] Every `Needs attention` item is actionable, dated where relevant, and classified as blocking or non-blocking.
- [ ] Clock actions pass duplicate, stale-state, network-loss, two-tab/device, and session-expiry tests.
- [ ] Today passes keyboard-only, screen-reader, 200% zoom, 320 CSS-pixel reflow, forced-colors, reduced-motion, and mobile tests.
- [ ] Approval inbox defaults to actionable work and secondary filters no longer dominate the first viewport.
- [ ] Team and employee administration rows expose clear next actions and work on narrow screens.
- [ ] Permanent horizontal-scroll instructions are removed unless overflow is present and relevant.
- [ ] Automated and manual visual, usability, accessibility, and regression gates pass.
- [ ] `PROJECT_STATUS.md`, `TODO.md`, `docs/07-roadmap.md`, `docs/08-task-board.md`, changelog/release notes, screenshots, and relevant UX documentation are updated.
- [ ] All workspace manifests are bumped to `0.14.0` only after all gates pass.

**Gate evidence:** coherent fixture tests, API/view-model contract tests, Playwright core flows, Storybook/state-matrix evidence, deterministic screenshots at required viewports, axe results, manual accessibility notes, usability review, release checklist, and updated project status.
