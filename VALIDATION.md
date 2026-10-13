# Validation

Verified on 13 October 2026 against the local Aquadactyl checkout and its running
`aquadactyl-test-panel-1` Docker container. The installation uses Blueprint
beta-2026-08, PHP 8.5, Node 24, React 19, TypeScript 7, Vite 8 and GameDig 5.3.3.

| Check | Result |
| --- | --- |
| Protocol and data tests | 13 passed |
| Backend authorization, targets, cache, commands and inventory checks | 113 passed |
| Page/dialog interactions, item images, vitals and Nitrocraft API tests in Aquadactyl's Vitest runner | 39 passed |
| Installed frontend TypeScript check | Passed |
| Addon JavaScript/TypeScript lint | Passed, no warnings |
| PHP syntax checks | Passed for every addon PHP file |
| Blueprint fresh installation | Passed, including production asset build |
| Blueprint update of an existing installation | Passed |
| Blueprint removal | Passed; addon API route removed |
| Blueprint fresh reinstall after removal | Passed |
| Live Minecraft PHP-to-Node request | Full UDP Query reply from Paper; RepGraphics online, capacity 20 |
| Authenticated endpoint | HTTP 200 with live player snapshot |
| Unauthenticated endpoint | HTTP 401 |
| Unrelated user endpoint | HTTP 404 |
| Action/inventory endpoint authentication | HTTP 401 unauthenticated; HTTP 404 for unrelated users |
| Invalid action, missing confirmation and invalid inventory UUID | HTTP 422 |
| Pinned item image host | Diamond Sword and Stone returned valid PNG images; anonymous CORS supported |
| Bundled HUD sprites | Eight PNG signatures, chunks, pixel data and original bytes verified in the package |
| Live saved player vitals | Wings read: health 20, food 20, XP level 0, XP progress 0 |
| Package | Root-level Blueprint ZIP with a SHA256 sidecar |

The full Query tests use actual local UDP fixtures, including a 12-player reply
that exceeds the one-name TCP fixture's sample. They also cover empty servers,
partial Query replies, hidden status names, non-Minecraft replies, separate Query
and status ports, malformed inputs and player-name validation. Fixtures now use
the real Minecraft `game_id` key and also cover legacy `gamename` replies and
non-Minecraft identifier precedence. Version 1.1.2 fixes the previous rejection
of valid `game_id` replies. The local Paper server has Query enabled, and the
installed addon was checked against its live full reply with RepGraphics joined.

Backend tests additionally cover command allowlists, reason injection,
confirmation, owner/admin OP restrictions, inventory file permissions, per-user
capabilities outside the shared cache and fake Wings dispatch/auditing. Binary
NBT fixtures cover legacy and modern inventories, equipment, all Java tag types,
gzip, malformed/truncated data, excessive nesting, oversized input and metadata.
Saved-file fixtures verify world paths, server UUID precedence, standard and
alternate player-save layouts, timestamps and player-state files. Streaming
limits are checked even without a Content-Length header.

UI tests cover search, partial-list labels, hidden-name and zero-player states,
unreachable servers, stale results after failed refresh, both copy actions,
clipboard failure, turning automatic refresh off, unsupported servers and offline
lookup. The real panel dialog is tested for confirmations, cancellation, failed
and duplicate submissions, permission visibility, lazy inventory reads, keyboard
tabs, equipment/hotbar/Ender Chest mapping, stale snapshots, missing files and
safe metadata rendering. Nitrocraft tests cover response validation, fixed-origin
URLs, cancellation and credential/referrer omission. API tests use mocked responses.
The public Nitrocraft identity endpoint was also checked with a real username.

Version 1.1.3 adds native inventory renders, with tests for vanilla tools and
blocks, modded/unsafe ID handling, lazy and anonymous loading, image success,
missing-image fallback and changing an item after a failed image load. Diamond
Sword and Stone images from the pinned collection were downloaded and visually
inspected. Inventory integration checks still cover counts, slots and metadata.

Version 1.1.4 adds hearts, hunger and XP HUD meters using bundled game textures.
NBT checks verify `XpP` independently of XP level, including missing, zero, full,
non-finite and invalid fractions. UI tests cover half hearts, right-to-left
hunger, percentage clipping, zero versus unknown, old API responses, invalid
values, extra health and refreshed snapshots. Binary PNGs are preserved during
packaging, with archive CRC, PNG chunk CRC, decompression and SHA256 verification.

A live RepGraphics saved file was inspected through Wings for health, food,
XP level and XP progress. Legacy/modern inventory shapes and malformed files are
covered by fixtures. No commands were sent to a real server.
The computer-use browser connection was unavailable, so screenshots and manual
desktop/mobile visual verification were not performed.

The addon is installed on the existing local test panel for review. No game
configuration was changed, no commands were sent to Minecraft, and no external
deployment or GitHub publication was performed. The Aquadactyl source checkout
was used as a reference; addon source remains in the `MC Players` workspace.
