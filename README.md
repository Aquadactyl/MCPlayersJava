# Java Players for Aquadactyl

A Blueprint addon that adds a **Java Players** tab to your Minecraft Java servers.
The installable package is [`dist/mcplayers.blueprint`](dist/mcplayers.blueprint).

## Features

- Full player names through Minecraft Query, with the reported online count and capacity.
- TCP status fallback clearly labelled as a sample; hidden names are distinguished from an empty server.
- Case-insensitive search, alphabetical ordering, individual username copying and copying the returned list.
- Automatic refresh every 15 seconds while the page is visible, a manual refresh button and an optional polling toggle.
- A responsive charcoal interface that uses the panel's configured primary colour.
- Real player avatars and body renders from your [Nitrocraft API](https://nitrocraft.uk/docs), with local pixel fallbacks.
- Confirmed kick, ban, unban, OP, de-OP and whitelist actions, including offline username lookup.
- Read-only inventory, equipment and Ender Chest inspection, item metadata, health, food, XP and saved player state.
- Minecraft inventory item images, including 3D block renders, with category icons for modded or unavailable items.
- Minecraft hearts, hunger icons and an experience bar showing saved progress toward the next level.
- Saved inventory snapshots support both standard Java `world/playerdata` files and Aquadactyl's `world/players/data` layout.
- Permission checks, a 10-second shared server cache, a concurrency lock and bounded query timeouts.
- An admin setup page and inline instructions for enabling the full list.

Version **1.1.4** adds the Minecraft HUD for saved health, hunger and XP progress.
Version **1.1.3** adds actual Minecraft item images to inventory slots and item
details. Version **1.1.2** fixes full Query detection on Paper and other Java servers that
identify Minecraft with `game_id`. Legacy `gamename` replies are also accepted.
Previously, valid full replies using `game_id` fell back to a status sample even
with Query enabled and reachable. Install this update and refresh the Java Players tab.

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
application caches. Open **Admin → Extensions → Java Players** for setup
instructions. Use the gear button and choose your Minecraft Java eggs under
**Route eggs**. Blueprint defaults to showing the tab on every egg; other games
show a clear unsupported message.

Server owners and administrators can view the page. Subusers need the existing
**Send console commands** (`control.console`) permission. The backend enforces
both server membership and this permission; hiding a navigation item alone is
not the access check.

| Feature | Required permission |
| --- | --- |
| Player list, profiles, kick, ban, unban and whitelist actions | Send console commands (`control.console`) |
| OP and de-OP | Server owner or panel administrator, with console access |
| Saved inventory | Console access plus List files (`file.read`) and Read file contents (`file.read-content`) |

Every backend endpoint enforces these permissions. Actions require confirmation,
accept only supported commands and valid Java usernames, and are recorded in the
panel activity log. The response means the command was **submitted** to Wings;
check the console for Minecraft's actual result. Whitelist actions change the
list, not the server's whitelist enable setting. Commands require a running server.

## Nitrocraft profiles

No API key is needed for the documented public player, avatar and body-render
endpoints. The browser resolves usernames through `https://nitrocraft.uk/players/`,
then loads avatars and body images from the same service. Identity lookups are
cached for 20 minutes, shared between the list and dialog, and avatars load as
they approach the visible area. Requests omit panel credentials and referrers.
Failed skin requests leave a local pixel avatar or an unavailable message.

Nitrocraft provides skins and profile identity. Server actions and inventory
inspection use Aquadactyl's authenticated backend and Wings. Nitrocraft UUIDs
are not used to locate server saves, which can use different offline-mode UUIDs.

## Saved inventory snapshots

Open **Manage** beside a player, or enter an offline username, then select
**Saved inventory**. The addon reads the world configured by `level-name` in
`server.properties`, checking both `playerdata/<uuid>.dat` and
`players/data/<uuid>.dat` under that world. It resolves the server's UUID from
`usercache.json`, then a supplied Java status UUID, then the offline UUID fallback.
If an online-mode player's UUID is absent from the cache and status sample, their
save may not be discoverable by username alone.

The viewer supports legacy item tags, modern item components and the newer
equipment compound. It shows main inventory, hotbar, armour, offhand, Ender Chest,
item IDs and metadata, selected slot, health, food, XP, location and state from
`ops.json`, `banned-players.json` and `whitelist.json`.
The save timestamp is shown when Wings provides it; unavailable state is labelled
unknown. Refresh rereads the files without forcing Minecraft to save.

These are **saved, read-only snapshots**, not live inventories. Minecraft may
have unsaved changes, and custom plugin storage formats are not supported. No
Minecraft plugin or RCON is required. Inspection never changes player data.
NBT decoding, file sizes, nesting, item metadata and request rates are bounded.

### Health, hunger and experience

The inventory HUD uses the game's full, half and empty heart and hunger sprites,
with a green XP bar and a separate level number. Fractional HP is displayed
numerically; hearts round upward to the next half heart, as in the game. Health
above 20 adds extra hearts, up to 50 icons, while the number shows the saved HP.
Hunger fills from right to left on its standard 20-point scale.

XP bar progress comes from the saved `XpP` fraction, independently of `XpLevel`.
Missing or invalid progress is labelled unavailable rather than inferred from
the level. Missing health and hunger are labelled unknown. These values retain
the same saved-snapshot limitations as the inventory.

The eight Minecraft 26.3 HUD sprites are bundled with the addon and served by the
panel, so they need no external image request. Sources and attribution are in
[`components/hud/README.md`](components/hud/README.md).

### Item images

Vanilla items use native Minecraft inventory renders from
[Owen1212055/mc-assets](https://github.com/Owen1212055/mc-assets), covering tools,
armour and 3D blocks. The addon uses the Minecraft **26.3** collection at fixed
revision `bc96011714c0eb3770bd641a3b86459ad5f860c7`, delivered through jsDelivr.
Images load lazily, remain crisp when scaled, and use the existing category icon
while loading or if an image fails. Item details show a larger image.

Only validated vanilla `minecraft:` IDs select remote images. Modded namespaces
use category icons. Images depict the default item model; resource packs, custom
models, potion colours and other metadata-based visual variants are not rendered.
The browser sends only the vanilla item name to the image host, with anonymous
requests and no referrer. Item counts, slot labels and metadata remain available
when the image service is unreachable.

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
Native player actions and saved inventory inspection remain available for
supported Java servers when global network queries are disabled.

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
A player-list snapshot can lag by the
10-second cache and the 15-second refresh interval; the page shows its check time.

The addon does not maintain an offline player history database. Username lookup
opens profiles and management tools even when a player is absent from the list.

## License

The addon code is free to use, copy, modify and redistribute under the
[BSD 2-Clause License](LICENSE). Redistributions must keep the original
copyright notice and license text, including the attribution to
**Aquadactyl contributors**.
Bundled Minecraft game graphics retain their original rights and separate credits
in [`components/hud/README.md`](components/hud/README.md).

## Build and test

Only development tests need a local GameDig installation. The installed addon
uses the panel's existing dependency. From this addon directory:

```bash
npm ci --ignore-scripts
npm test
python tools/package.py
python tools/verify_package.py
```

Packaging produces a reproducible root-level Blueprint ZIP and SHA256 file in
`dist/`. It includes addon files, the README, validation notes and licence; development
dependencies and test fixtures are excluded.

Against an installed addon in the local test panel:

```bash
docker cp tests aquadactyl-test-panel-1:/tmp/mcplayers-tests
docker exec aquadactyl-test-panel-1 php /tmp/mcplayers-tests/management.php /app
docker exec aquadactyl-test-panel-1 pnpm run types
docker exec aquadactyl-test-panel-1 pnpm exec oxlint .blueprint/extensions/mcplayers/components
docker exec aquadactyl-test-panel-1 mkdir -p /app/resources/scripts/mcplayers-tests
docker cp tests/PlayersPage.spec.tsx aquadactyl-test-panel-1:/app/resources/scripts/mcplayers-tests/PlayersPage.spec.tsx
docker cp tests/PlayerDialog.spec.tsx aquadactyl-test-panel-1:/app/resources/scripts/mcplayers-tests/PlayerDialog.spec.tsx
docker cp tests/nitrocraft.spec.ts aquadactyl-test-panel-1:/app/resources/scripts/mcplayers-tests/nitrocraft.spec.ts
docker cp tests/ItemIcon.spec.tsx aquadactyl-test-panel-1:/app/resources/scripts/mcplayers-tests/ItemIcon.spec.tsx
docker cp tests/PlayerVitals.spec.tsx aquadactyl-test-panel-1:/app/resources/scripts/mcplayers-tests/PlayerVitals.spec.tsx
docker exec aquadactyl-test-panel-1 pnpm exec vitest run resources/scripts/mcplayers-tests/
```

With an existing running Java server on that test panel:

```bash
docker cp tests/runtime.php aquadactyl-test-panel-1:/tmp/mcplayers-runtime.php
docker exec aquadactyl-test-panel-1 php /tmp/mcplayers-runtime.php /app
```

To inspect HUD values from an existing saved player without sending game commands:

```bash
docker cp tests/vitals-runtime.php aquadactyl-test-panel-1:/tmp/mcplayers-vitals-runtime.php
docker exec aquadactyl-test-panel-1 php /tmp/mcplayers-vitals-runtime.php /app YOUR_SERVER_UUID PlayerName
```

Backend fixtures use in-memory models and cache. The runtime smoke test reads
the local test panel, sets authentication only inside its CLI process and creates
no API keys. Command tests use a fake Wings repository; runtime tests send only
requests rejected by authentication or validation. Tests do not send Minecraft
commands, change server settings or write game files.

Validation and environment details are recorded in [VALIDATION.md](VALIDATION.md).

## Source layout

| Path | Purpose |
| --- | --- |
| `conf.yml` | Blueprint metadata and asset paths |
| `components/Components.yml` | Permission-aware server navigation route |
| `components/PlayersPage.tsx` | Player page and refresh/search/copy interactions |
| `components/PlayerDialog.tsx` | Player profiles, confirmations and saved inventory tab |
| `components/InventoryView.tsx` | Read-only inventory slots and item metadata |
| `components/ItemIcon.tsx` | Native Minecraft item images and loading/error fallbacks |
| `components/PlayerVitals.tsx` | Saved health, hunger and XP HUD |
| `components/hud/` | Bundled Minecraft HUD sprites and source credits |
| `components/nitrocraft.ts` | Public identity lookup and fixed-origin skin URLs |
| `components/players.css` | Scoped responsive styling bundled with the Java Players page |
| `app/` | Authorization, query/cache, native command dispatch and bounded NBT snapshot decoding |
| `private/query.mjs` | Bounded UDP Query / TCP status helper |
| `routes/client.php` | Authenticated listing, action and inventory endpoints |
| `admin/view.blade.php` | Administrator setup instructions |
| `tests/` | Protocol, permission/cache, UI and runtime tests |
| `tools/package.py` | Reproducible `.blueprint` packaging |
| `tools/verify_package.py` | Archive, binary PNG and SHA256 verification |

The framework references are Aquadactyl's [addon development guide](https://github.com/Aquadactyl/aquadactyl/blob/main/docs/ADDONS.md)
and [bundled Blueprint reference](https://github.com/Aquadactyl/aquadactyl/blob/main/docs/BLUEPRINT.md).
