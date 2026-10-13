# Validation

Verified on 13 October 2026 against the local Aquadactyl checkout and its running
`aquadactyl-test-panel-1` Docker container. The installation uses Blueprint
beta-2026-08, PHP 8.5, Node 24, React 19, TypeScript 7, Vite 8 and GameDig 5.3.3.

| Check | Result |
| --- | --- |
| Protocol and data tests | 11 passed |
| Backend authorization, target and cache checks | 31 passed |
| Page interaction tests in Aquadactyl's Vitest runner | 9 passed |
| Installed frontend TypeScript check | Passed |
| Addon JavaScript/TypeScript lint | Passed, no warnings |
| PHP syntax checks | Passed for every addon PHP file |
| Blueprint fresh installation | Passed, including production asset build |
| Blueprint update of an existing installation | Passed |
| Blueprint removal | Passed; addon API route removed |
| Blueprint fresh reinstall after removal | Passed |
| Live Minecraft PHP-to-Node request | Available Java status reply; zero players online, capacity 20 |
| Authenticated endpoint | HTTP 200 with live player snapshot |
| Unauthenticated endpoint | HTTP 401 |
| Unrelated user endpoint | HTTP 404 |
| Package | Root-level Blueprint ZIP with a SHA256 sidecar |

The full Query tests use actual local UDP fixtures, including a 12-player reply
that exceeds the one-name TCP fixture's sample. They also cover empty servers,
partial Query replies, hidden status names, non-Minecraft replies, separate Query
and status ports, malformed inputs and player-name validation. The running
Minecraft server currently has Query disabled, so the live smoke test verifies
the status fallback. A live full Query reply with real joined players was not
available; full-list behaviour was verified against the protocol fixtures.

UI tests cover search, partial-list labels, hidden-name and zero-player states,
unreachable servers, stale results after failed refresh, both copy actions,
clipboard failure, turning automatic refresh off and unsupported servers.
The computer-use browser connection was unavailable, so screenshots and manual
desktop/mobile visual verification were not performed.

The addon is installed on the existing local test panel for review. No game
configuration was changed, no commands were sent to Minecraft, and no external
deployment or GitHub publication was performed. The Aquadactyl source checkout
was used as a reference; addon source remains in the `MC Players` workspace.
