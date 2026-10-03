# Cloud and desktop integration — 2026-10-03

The cloud task `앱스토어 1등 목표 위한 개발 진행` in the environment `축구 감독 v22`
and the company handoff had diverged from the portable v22 main branch.

Cloud task: https://chatgpt.com/codex/cloud/tasks/task_e_6ac090f232c483289514a37f274f4637

## Verified sources

- Company completed branch: `35b7701142be6da6d74cdd35da592c7e18794eba`.
- Company unfinished handoff: `831de88f8304957cbc28b8d92f5b83d7ae06d2c3`.
- GitHub PR #2 / `codex/-1`: `c67671a`, containing readiness and opponent-aware guidance.
- Successful cloud logs show `445a622` (momentum), `4a0e00f` (analyst alerts),
  `74edc77` (squad planner), `009395a` (rotation previews), and `3b18426` (suggested substitutions).

The cloud task's Git export exposed only the earlier readiness snapshot. A follow-up
export and retries failed before the agent started with `Failed to apply patch to repo`.
The cloud environment setup was changed to leave the checkout untouched (Node/Python
version checks only, caching off); unpacking sources before task patch restoration can
cause collisions. Existing task restoration still did not succeed.

Consequently, **this integration does not claim to contain those five original Git
objects or their complete history**. Readiness was merged from the actual GitHub branch.
Momentum, substitution suggestions, rotation planning and UI changes were recovered
from source excerpts printed in successful task logs, using the verified v22 ZIP as
the comparison base. Missing analyst decision and squad-depth model bodies and some
styles were reimplemented to the observed behavior and recovered tests. This distinction
must remain visible; do not describe this as a byte-for-byte restoration of `3b18426`.

## Integration behavior

Company features (Europe, staff, talks, press/media, Android, start menu and mobile
layout) are retained. Recovered coach/planner features now respect dismissed players.
Suggestion review pauses and selects a player; it does not substitute automatically.
Rotation previews require confirmation against current match, identity, availability,
energy and main-skill inputs. Momentum reads actual events without consuming RNG.

Card participation now feeds statistics, career, fatigue forecasts and restore checks.
Legacy campaigns without cards stay card-free. Unpublished handoff saves with cards
but no campaign flag migrate to explicit card rules. Cards apply only within the
current match; accumulated bookings and next-match suspensions remain unimplemented.

Local verification: 59 suites / 637 checks, public PWA 14 checks, Android offline
asset generation, and Chromium UI checks at 360×640, 390×844 and 1280×900.
Android APK/AAB/lint/emulator validation must be checked on the integration PR's CI;
the older handoff's APK result is not evidence for this revision.

## Continue safely

Use tracked `source/`, not the historical ZIP or a cloud task's prose summary. Push
each completed checkpoint and record the branch and full commit SHA. On another
computer, fetch that same branch before editing. Never overwrite a dirty checkout
with a ZIP or reset it to recover an older task. Personal game JSON and signing keys
must stay outside Git.
