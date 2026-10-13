# Minecraft Players for Aquadactyl

A Blueprint addon that adds a **Players** tab to your Minecraft Java servers.
The installable package is [`dist/mcplayers.blueprint`](dist/mcplayers.blueprint).

## Features

- Full player names through Minecraft Query, with the reported online count and capacity.
- TCP status fallback clearly labelled as a sample; hidden names are distinguished from an empty server.
- Case-insensitive search, alphabetical ordering, individual username copying and copying the returned list.
- Automatic refresh every 15 seconds while the page is visible, a manual refresh button and an optional polling toggle.
- A responsive charcoal interface that uses the panel's configured primary colour.
- Local pixel avatars; no third-party skin service, external player API, RCON password or Minecraft plugin.
- Saved inventory snapshots support both standard Java `world/playerdata` files and Aquadactyl's `world/players/data` layout.
- Permission checks, a 10-second shared server cache, a concurrency lock and bounded query timeouts.
- An admin setup page and inline instructions for enabling the full list.

## Compatibility

Built against [Aquadactyl/aquadactyl](https://github.com/Aquadactyl/aquadactyl)
and its bundled **Blueprint beta-2026-08**. The addon uses Aquadactyl's React 19,
Zustand `ServerContext`, TanStack Query, Lucide, shared Axios client and GameDig
5.3.3. The PHP backend runs inside the panel and launches the Node query helper
through Symfony Process, following the panel's existing game query approach.

This release supports **Minecraft Java**, including compatible modded servers.
Proxies must expose their own Minecraft Query or Java status endpoint. Bedrock's
status protocol does not return player names and is unsupported. Compatibility
with stock Pterodactyl or older Blueprint installations has not been tested.

No additional dependencies are installed into the panel, and no core panel files
are patched by addon scripts. Blueprint manages the normal route, component and
CSS hooks. Removing the extension removes those hooks.

## Install

Copy `dist/mcplayers.blueprint` into the panel root, then run:

```bash
cd /var/www/aquadactyl
sudo blueprint -i mcplayers
```

Use your actual panel directory if it is different. For Aquadactyl's local Docker
stack, run from this addon directory:

```bash
docker cp dist/mcplayers.blueprint aquadactyl-test-panel-1:/app/mcplayers.blueprint
docker exec aquadactyl-test-panel-1 blueprint -i mcplayers
```

Blueprint registers the backend and frontend, rebuilds assets and refreshes
application caches. Open **Admin → Extensions → Minecraft Players** for setup
instructions. Use the gear button and choose your Minecraft Java eggs under
**Route eggs**. Blueprint defaults to showing the tab on every egg; other games
show a clear unsupported message.

Server owners and administrators can view the page. Subusers need the existing
**Send console commands** (`control.console`) permission. The backend enforces
both server membership and this permission; hiding a navigation item alone is
not the access check.

## Enable the full player list

In the Minecraft server's `server.properties`, set:

```properties
enable-query=true
query.port=25565
```

Replace `25565` with the server's assigned port, allow UDP on that port from the
panel host and restart the Minecraft server. The panel host, rather than your
browser, makes the Query and status requests. Query generally exposes its player
list to any host that can reach it; restrict UDP access to the panel host when
appropriate for your network.

If Query uses a different assigned port, select that allocation under
**Admin → Servers → your server → Details → Query address / port**. Assign the
port to the server first if needed. The addon queries that port over UDP and
continues to use the primary allocation for the TCP status fallback.

Java eggs are detected by name (Minecraft, Paper, Purpur, Spigot, Forge, Fabric,
Folia, Sponge, BungeeCord, Waterfall or Velocity). For a custom egg name, choose
**Minecraft Java** under **Game type** on the same admin Details page. **Disabled
(not a game)** (`none`) disables the addon for that server. Bedrock, PocketMine
and Nukkit eggs are excluded from automatic detection.

The addon runs independently of the dashboard player-count visibility toggle.
It uses the existing per-server game type, allocation and node query address.
The global `GAME_QUERY_ENABLED=false` setting disables its network queries too.

## Update or remove

Replace the package in the panel root and run the same install command to update:

```bash
sudo blueprint -i mcplayers
```

Remove through Blueprint:

```bash
sudo blueprint -r mcplayers
```

For an unattended removal, use `blueprint -r mcplayers --yes`. There are no addon
database migrations, durable player records or custom install/remove scripts.
Keep the original package in the panel root so Aquadactyl can restore extension
hooks during a managed panel update.

## How names are reported

| Source | Meaning |
| --- | --- |
| Minecraft Query | Full UDP Query reply. Labelled complete only when valid unique names match the reported online count. |
| Server status | Java TCP status sample. Always labelled partial, even if it happens to contain all players. |
| No names, positive count | The server is reachable but hid names or returned no valid Java usernames. |
| Unreachable | Neither endpoint returned a valid reply. The server might be offline, unreachable or have status disabled. |

Query lists normally provide usernames but not UUIDs. Status samples may provide
UUIDs. Names are restricted to valid Java username characters and length, sorted
and deduplicated; counts are never inferred from the number of returned names.
Pixel avatars are decorative, not actual player skins. A snapshot can lag by the
10-second cache and the 15-second refresh interval; the page shows its check time.

The addon only reads server information. It does not send console commands or
provide kick, ban, whitelist or offline player history features.

## License

This project is free to use, copy, modify and redistribute under the
[BSD 2-Clause License](LICENSE). Redistributions must keep the original
copyright notice and license text, including the attribution to
**Aquadactyl contributors**.

## Build and test

Only development tests need a local GameDig installation. The installed addon
uses the panel's existing dependency. From this addon directory:

```bash
npm ci --ignore-scripts
npm test
python tools/package.py
```

Packaging produces a reproducible root-level Blueprint ZIP and SHA256 file in
`dist/`. It includes addon files, the README, validation notes and licence; development
dependencies and test fixtures are excluded.

Against an installed addon in the local test panel:

```bash
docker cp tests/backend.php aquadactyl-test-panel-1:/tmp/mcplayers-backend.php
docker exec aquadactyl-test-panel-1 php /tmp/mcplayers-backend.php /app
docker exec aquadactyl-test-panel-1 pnpm run types
docker exec aquadactyl-test-panel-1 pnpm exec oxlint .blueprint/extensions/mcplayers/components
docker exec aquadactyl-test-panel-1 mkdir -p /app/resources/scripts/mcplayers-tests
docker cp tests/PlayersPage.spec.tsx aquadactyl-test-panel-1:/app/resources/scripts/mcplayers-tests/PlayersPage.spec.tsx
docker exec aquadactyl-test-panel-1 pnpm exec vitest run resources/scripts/mcplayers-tests/PlayersPage.spec.tsx
```

With an existing running Java server on that test panel:

```bash
docker cp tests/runtime.php aquadactyl-test-panel-1:/tmp/mcplayers-runtime.php
docker exec aquadactyl-test-panel-1 php /tmp/mcplayers-runtime.php /app
```

Backend fixtures use in-memory models and cache. The runtime smoke test reads
the local test panel, sets authentication only inside its CLI process and creates
no API keys. Tests do not change server settings or write game files.

Validation and environment details are recorded in [VALIDATION.md](VALIDATION.md).

## Source layout

| Path | Purpose |
| --- | --- |
| `conf.yml` | Blueprint metadata and asset paths |
| `components/Components.yml` | Permission-aware server navigation route |
| `components/PlayersPage.tsx` | Player page and refresh/search/copy interactions |
| `components/players.css` | Scoped responsive styling bundled with the Players page |
| `app/` | Laravel authorization, query targeting, cache and process runner |
| `private/query.mjs` | Bounded UDP Query / TCP status helper |
| `routes/client.php` | Authenticated extension endpoint |
| `admin/view.blade.php` | Administrator setup instructions |
| `tests/` | Protocol, permission/cache, UI and runtime tests |
| `tools/package.py` | Reproducible `.blueprint` packaging |

The framework references are Aquadactyl's [addon development guide](https://github.com/Aquadactyl/aquadactyl/blob/main/docs/ADDONS.md)
and [bundled Blueprint reference](https://github.com/Aquadactyl/aquadactyl/blob/main/docs/BLUEPRINT.md).
