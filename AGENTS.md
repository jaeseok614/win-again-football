# Football manager development

Read DEVELOPMENT.md before changing the game.
The latest modular source is tracked in source/. The original fallback snapshot is
football-source-v22.zip. If source/ is absent,
run `python3 setup-source.py` (Windows: `python setup-source.py`). This verifies the
archive and extracts 140 files. If source/ exists, keep its current changes.

Develop in source/dist, not the generated root index.html. Use Node.js and Python
standard libraries; no npm install is needed. Test using the commands in
DEVELOPMENT.md. Keep season save key win-again-season-v17 and legacy restore
compatibility. Preserve existing campaigns during tests; use isolated fixtures.

Never commit personal campaign exports, credentials, .openai, or local QA pages.
The root files serve the published game. Source edits alone do not update the
published game; prepare and verify the complete PWA bundle before deployment.
Commit edited modular source files so subsequent tasks can continue from them.

## Persistent development requirements from the owner (2026-10-02)

Consider performance in every change, especially on mobile. Avoid rebuilding
hidden dashboards during live match ticks; defer expensive work and keep startup
assets small. Verify the actual mobile UI, touch targets and responsiveness.
For operations that may take perceptible time, immediately show a loading state
or progress gauge. Show a percentage only when progress can be measured; otherwise
use an indeterminate indicator with a clear description. Prevent duplicate actions,
show completion or failure, and offer a retry when useful. Never leave the player
looking at an apparently frozen screen. Preserve these requirements in future work.

Source now includes the full modular tree. Run `node source/run-tests.cjs` and build
the complete public PWA with `node source/build-pwa.cjs`. Do not commit personal
QA fixtures or browser saves. The v22 ZIP is the original fallback, not the newest
source; setup-source.py only fills missing files and preserves current edits.

Champions League is implemented in europe.js with the shared Football engine.
Prior-season division 1 ranks 1 and 2 qualify for the following season. Preserve
the 14 league rounds and 56 league result rows; international matches use their
own results, receipts and statistics. Domestic Cup takes priority at a shared
calendar gate. Only league matches consume salaries and staff contract weeks.
Legacy saves keep their current match and season without adding European games;
qualification applies after the next season transition. Keep strict deterministic
fixture, RNG, receipt and historical champion validation. National-team matches
remain future work. The Europe panel renders only when the tournament view opens.
