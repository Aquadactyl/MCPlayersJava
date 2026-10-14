<style>
    .mcp-admin {
        margin-bottom: 24px;
        border: 1px solid var(--aqua-border, #303942);
        border-radius: 8px;
        background: var(--aqua-surface, #1c232a);
        color: var(--aqua-text, #d7dce1);
        font-size: 13px;
        line-height: 1.65;
    }

    .mcp-admin .mcp-admin-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        padding: 26px 28px;
        border-bottom: 1px solid var(--aqua-border, #303942);
    }

    .mcp-admin h2,
    .mcp-admin h3 {
        color: var(--aqua-heading, #f5f6f7);
        font-weight: 600;
        line-height: 1.4;
    }

    .mcp-admin h2 {
        margin: 0 0 6px;
        font-size: 21px;
        letter-spacing: -0.02em;
    }

    .mcp-admin h3 {
        margin: 0 0 16px;
        font-size: 15px;
    }

    .mcp-admin p {
        margin: 0;
        color: var(--aqua-muted, #9ca5af);
    }

    .mcp-admin .mcp-admin-configure {
        display: inline-flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 9px 14px;
        border: 1px solid var(--aqua-control-border, #39424b);
        border-radius: 5px;
        background: var(--aqua-raised, #272e35);
        color: var(--aqua-heading, #f5f6f7);
        font: inherit;
        font-weight: 600;
        cursor: pointer;
    }

    .mcp-admin .mcp-admin-configure:hover {
        border-color: var(--aqua-accent, #78d4cc);
        background: var(--aqua-hover, #29333d);
    }

    .mcp-admin .mcp-admin-configure:focus-visible,
    .mcp-admin a:focus-visible,
    .mcp-admin summary:focus-visible {
        outline: 2px solid var(--aqua-accent, #78d4cc);
        outline-offset: 4px;
    }

    .mcp-admin .mcp-admin-columns {
        display: grid;
        grid-template-columns: minmax(0, 1.8fr) minmax(260px, 1fr);
    }

    .mcp-admin .mcp-admin-main,
    .mcp-admin .mcp-admin-aside {
        min-width: 0;
        padding: 26px 28px;
    }

    .mcp-admin .mcp-admin-aside {
        border-left: 1px solid var(--aqua-border, #303942);
        border-radius: 0 0 8px 0;
        background: var(--aqua-chrome, #11161b);
    }

    .mcp-admin .mcp-admin-steps {
        display: grid;
        gap: 17px;
        margin: 0 0 30px;
        padding: 0;
        list-style: none;
        counter-reset: mcp-setup;
    }

    .mcp-admin .mcp-admin-steps li {
        display: grid;
        grid-template-columns: 26px minmax(0, 1fr);
        gap: 12px;
        counter-increment: mcp-setup;
    }

    .mcp-admin .mcp-admin-steps li::before {
        content: counter(mcp-setup);
        display: grid;
        place-items: center;
        width: 26px;
        height: 26px;
        border: 1px solid var(--aqua-border, #303942);
        border-radius: 50%;
        color: var(--aqua-accent, #78d4cc);
        font-size: 12px;
        font-weight: 600;
    }

    .mcp-admin .mcp-admin-steps strong {
        display: block;
        margin-bottom: 2px;
        font-weight: 600;
    }

    .mcp-admin .mcp-admin-table {
        width: 100%;
        margin-bottom: 12px;
        border-collapse: collapse;
        font-size: 12px;
        text-align: left;
    }

    .mcp-admin .mcp-admin-table th,
    .mcp-admin .mcp-admin-table td {
        padding: 12px 10px;
        border-bottom: 1px solid var(--aqua-border, #303942);
        vertical-align: top;
        overflow-wrap: normal;
    }

    .mcp-admin .mcp-admin-table th:first-child,
    .mcp-admin .mcp-admin-table td:first-child {
        padding-left: 0;
    }

    .mcp-admin .mcp-admin-table th:last-child,
    .mcp-admin .mcp-admin-table td:last-child {
        padding-right: 0;
    }

    .mcp-admin .mcp-admin-table thead th {
        padding-top: 0;
        color: var(--aqua-muted, #9ca5af);
        font-weight: 400;
    }

    .mcp-admin .mcp-admin-table tbody th {
        font-weight: 500;
        overflow-wrap: anywhere;
    }

    .mcp-admin .mcp-admin-table td:last-child code {
        white-space: nowrap;
        overflow-wrap: normal;
    }

    .mcp-admin .mcp-admin-note {
        font-size: 12px;
    }

    .mcp-admin .mcp-admin-aside section + section {
        margin-top: 26px;
        padding-top: 24px;
        border-top: 1px solid var(--aqua-border, #303942);
    }

    .mcp-admin .mcp-admin-aside h3 {
        margin-bottom: 10px;
    }

    .mcp-admin .mcp-admin-aside p + p {
        margin-top: 12px;
    }


    .mcp-admin .mcp-admin-guide {
        color: var(--aqua-accent, #78d4cc);
        text-decoration: underline;
        text-underline-offset: 3px;
    }

    .mcp-admin .mcp-admin-guide:hover {
        color: var(--aqua-accent-hover, #a4e3dc);
    }

    .mcp-admin code {
        padding: 2px 5px;
        border-radius: 3px;
        background: var(--aqua-raised, #272e35);
        color: var(--aqua-text, #d7dce1);
        font-size: 0.92em;
        white-space: normal;
        overflow-wrap: anywhere;
    }

    .mcp-admin .mcp-admin-file {
        display: block;
        margin: 12px 0;
        padding: 10px 12px;
        border: 1px solid var(--aqua-border, #303942);
    }

    .mcp-admin .mcp-admin-permissions {
        margin: 0;
    }

    .mcp-admin .mcp-admin-permissions dt {
        margin-top: 14px;
        font-weight: 500;
    }

    .mcp-admin .mcp-admin-permissions dt:first-child {
        margin-top: 0;
    }

    .mcp-admin .mcp-admin-permissions dd {
        margin: 3px 0 0;
        color: var(--aqua-muted, #9ca5af);
        font-size: 12px;
    }

    .mcp-admin .mcp-admin-details {
        margin-top: 24px;
        padding-top: 18px;
        border-top: 1px solid var(--aqua-border, #303942);
        font-size: 12px;
    }

    .mcp-admin summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        color: var(--aqua-text, #d7dce1);
        list-style: none;
        cursor: pointer;
    }

    .mcp-admin summary::-webkit-details-marker {
        display: none;
    }

    .mcp-admin summary::after {
        content: "+";
        color: var(--aqua-accent, #78d4cc);
        font-size: 18px;
        line-height: 1;
    }

    .mcp-admin details[open] summary::after {
        content: "\2212";
    }

    .mcp-admin .mcp-admin-details p {
        margin-top: 12px;
    }

    @media (max-width: 1100px) {
        .mcp-admin .mcp-admin-columns {
            grid-template-columns: minmax(0, 1fr);
        }

        .mcp-admin .mcp-admin-aside {
            border-top: 1px solid var(--aqua-border, #303942);
            border-left: 0;
            border-radius: 0 0 8px 8px;
        }
    }

    @media (max-width: 600px) {
        .mcp-admin .mcp-admin-header {
            align-items: flex-start;
            flex-direction: column;
            gap: 16px;
        }

        .mcp-admin .mcp-admin-header,
        .mcp-admin .mcp-admin-main,
        .mcp-admin .mcp-admin-aside {
            padding: 20px;
        }

        .mcp-admin .mcp-admin-table th,
        .mcp-admin .mcp-admin-table td {
            padding: 10px 6px;
        }
    }

    .mcp-admin .mcp-admin-config {
        margin: 10px 0;
        padding: 10px 12px;
        border: 1px solid var(--aqua-border, #303942);
        border-radius: 3px;
        background: var(--aqua-chrome, #11161b);
        color: var(--aqua-text, #d7dce1);
        font-size: 12px;
        line-height: 1.65;
    }

    .mcp-admin .mcp-admin-config code {
        padding: 0;
        background: transparent;
        font-size: inherit;
        white-space: pre;
    }

    .mcp-admin .mcp-admin-note + .mcp-admin-note {
        margin-top: 12px;
    }
</style>

<section class="mcp-admin" aria-labelledby="mcp-admin-title">
    <header class="mcp-admin-header">
        <div>
            <h2 id="mcp-admin-title">Setup &amp; server support</h2>
            <p>View players, manage access and inspect saved inventories from each server's Java Players tab.</p>
        </div>
        <button type="button" class="mcp-admin-configure" data-toggle="modal" data-target="#extensionConfigModal" aria-haspopup="dialog">
            <i class="fa fa-sliders" aria-hidden="true"></i>
            Configure servers
        </button>
    </header>

    <div class="mcp-admin-columns">
        <div class="mcp-admin-main">
            <section aria-labelledby="mcp-admin-setup-title">
                <h3 id="mcp-admin-setup-title">Before you start</h3>
                <ol class="mcp-admin-steps" role="list">
                    <li>
                        <div>
                            <strong>Choose your Minecraft Java eggs</strong>
                            <p>Open Configure servers, select your Java eggs under <b>Route eggs</b> and save. Blueprint initially shows the tab on all eggs; other games receive an unsupported message.</p>
                        </div>
                    </li>
                    <li>
                        <div>
                            <strong>Enable Minecraft Query</strong>
                            <p>Update the server's <code>server.properties</code> with these settings, replacing <code>25565</code> with its assigned Query port.</p>
                            <pre class="mcp-admin-config"><code>enable-query=true
query.port=25565</code></pre>
                            <p class="mcp-admin-note">For a separate Query port, assign it to the server first, then select it under <b>Admin &rarr; Servers &rarr; your server &rarr; Details &rarr; Query address / port</b>. TCP status continues to use the primary allocation.</p>
                        </div>
                    </li>
                    <li>
                        <div>
                            <strong>Allow UDP and restart Minecraft</strong>
                            <p>Allow inbound UDP on the Query port from the panel host, then restart the server. Open the <b>Java Players</b> tab and refresh to check the list.</p>
                        </div>
                    </li>
                </ol>
            </section>

            <section aria-labelledby="mcp-admin-support-title">
                <h3 id="mcp-admin-support-title">Player list sources</h3>
                <table class="mcp-admin-table" aria-labelledby="mcp-admin-support-title">
                    <thead>
                        <tr>
                            <th scope="col">Source</th>
                            <th scope="col">Player names</th>
                            <th scope="col">Connection</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th scope="row">Minecraft Query</th>
                            <td>Full list when valid, unique names match the reported online count</td>
                            <td>UDP &middot; Query allocation</td>
                        </tr>
                        <tr>
                            <th scope="row">Java server status</th>
                            <td>Sample only, even if all players happen to appear</td>
                            <td>TCP &middot; Primary allocation</td>
                        </tr>
                    </tbody>
                </table>
                <p class="mcp-admin-note">Hidden names and incomplete replies are never shown as a complete list. An online count without names is different from an empty server.</p>
                <p class="mcp-admin-note">Lists refresh every 15 seconds while visible, with a shared 10-second server cache. The panel host makes the queries; restrict UDP access to that host where possible.</p>
            </section>

            <details class="mcp-admin-details">
                <summary>Server compatibility &amp; troubleshooting</summary>
                <p>Minecraft Java and compatible modded servers are supported. Proxies must expose their own Minecraft Query or Java status endpoint. Bedrock, PocketMine and Nukkit are unsupported.</p>
                <p>For a custom Java egg name, choose <b>Minecraft Java</b> under <b>Game type</b> on the server's admin Details page. <b>Disabled (not a game)</b> (<code>none</code>) disables the addon for that server.</p>
                <p>If only a sample appears or the server is unreachable, check <code>enable-query=true</code>, the assigned Query port and inbound UDP from the panel host. Restart Minecraft after changing its properties.</p>
                <p><code>GAME_QUERY_ENABLED=false</code> disables network queries globally. Player actions and saved inventory inspection remain available for supported Java servers.</p>
            </details>

            <details class="mcp-admin-details">
                <summary>Player profiles &amp; moderation</summary>
                <p>Open a profile from the list or enter an offline username. Public <a class="mcp-admin-guide" href="https://nitrocraft.uk/docs" target="_blank" rel="noopener noreferrer">Nitrocraft API</a> avatars and body renders need no API key. Browser requests omit panel credentials and referrers; failures use local fallbacks.</p>
                <p>Kick, ban, unban, OP, de-OP and whitelist actions ask for confirmation and submit native commands through Wings. The server must be running. Whitelist actions change the list, not the whitelist enable setting.</p>
            </details>
        </div>

        <aside class="mcp-admin-aside" aria-label="Inventory setup and permissions">
            <section aria-labelledby="mcp-admin-inventory-title">
                <h3 id="mcp-admin-inventory-title">Inventory snapshots</h3>
                <p>Read inventory, equipment, Ender Chest, item metadata, hearts, hunger, XP and saved player state directly from Java player saves. No Minecraft plugin or RCON password is required.</p>
                <code class="mcp-admin-file">world/playerdata/&lt;uuid&gt;.dat<br>world/players/data/&lt;uuid&gt;.dat</code>
                <p class="mcp-admin-note">The world comes from <code>level-name</code> in <code>server.properties</code>. Server identities use <code>usercache.json</code>; missing entries can prevent online-mode saves from being found by username.</p>
                <p class="mcp-admin-note">Snapshots are read-only and reflect Minecraft's last save. Refresh rereads files without forcing a save. The addon never writes player files; custom plugin storage formats are unsupported.</p>
                <details class="mcp-admin-details">
                    <summary>Item images &amp; saved vitals</summary>
                    <p>Hearts and hunger use bundled Minecraft textures. The green XP bar shows the saved progress fraction, with the level displayed separately. Missing values remain labelled unknown or unavailable.</p>
                    <p>Vanilla items use inventory renders, including 3D blocks, from <a class="mcp-admin-guide" href="https://github.com/Owen1212055/mc-assets" target="_blank" rel="noopener noreferrer">mc-assets</a> via jsDelivr. Modded or unavailable images use category icons. Custom resource-pack models and metadata-based variants use the default item image.</p>
                </details>
            </section>

            <section aria-labelledby="mcp-admin-permissions-title">
                <h3 id="mcp-admin-permissions-title">Access &amp; permissions</h3>
                <dl class="mcp-admin-permissions">
                    <dt>Player lists, profiles &amp; moderation</dt>
                    <dd>Server owners, panel admins and subusers with <b>Send console commands</b> (<code>control.console</code>).</dd>
                    <dt>Saved inventory</dt>
                    <dd>Console access plus <b>List files</b> (<code>file.read</code>) and <b>Read file contents</b> (<code>file.read-content</code>).</dd>
                    <dt>OP &amp; de-OP</dt>
                    <dd>Server owners and panel admins only, with console access.</dd>
                    <dt>Command results</dt>
                    <dd>Check the server console to confirm Minecraft accepted a command. Permissions are enforced by the backend for every request.</dd>
                </dl>
            </section>
        </aside>
    </div>
</section>
