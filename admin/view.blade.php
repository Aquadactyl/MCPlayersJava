<div class="box box-default">
    <div class="box-header with-border"><h3 class="box-title">Minecraft Players</h3></div>
    <div class="box-body">
        <p>A live Players tab for Minecraft Java servers. Server owners, administrators and subusers with <strong>Send console commands</strong> permission can view it.</p>
        <h4>Enable the full player list</h4>
        <ol>
            <li>In the Minecraft server's <code>server.properties</code>, set <code>enable-query=true</code> and <code>query.port=25565</code> (replace 25565 with the server's assigned port).</li>
            <li>Allow inbound UDP on that port from the panel host, then restart the Minecraft server.</li>
            <li>If Query uses a separate assigned port, choose it under <strong>Admin → Servers → your server → Details → Query address / port</strong>. The TCP status fallback continues to use the primary allocation.</li>
        </ol>
        <p>The addon tries the full Query list first. If only Minecraft status responds, it labels names as a sample. Hidden player names and Query replies containing fewer names than the reported count are never shown as a complete list.</p>
        <p>Custom egg names can be enabled by selecting <strong>Minecraft Java</strong> as the server's game query type. A type of <strong>None</strong> disables the addon on that server, and <code>GAME_QUERY_ENABLED=false</code> disables its queries globally. Bedrock is unsupported because its status protocol does not provide player names.</p>
        <h4>Choose where the tab appears</h4>
        <p>Use the gear button above and choose the Minecraft Java eggs under <strong>Route eggs</strong>. Blueprint initially shows the tab on all eggs; other games receive an unsupported message.</p>
        <h4>Player profiles and actions</h4>
        <p>Open a player's profile from the list, or enter an offline username. Your public <a href="https://nitrocraft.uk/docs" target="_blank" rel="noreferrer">Nitrocraft API</a> provides real avatars and body renders without an API key. Skin requests come from the browser and omit panel credentials and referrers; failures use local fallbacks.</p>
        <p>Kick, ban, unban and whitelist actions require <strong>Send console commands</strong>. OP and de-OP are available only to the server owner and panel administrators. Each action requires confirmation and sends a native command through Wings; check the server console for Minecraft's result. The server must be running.</p>
        <h4>Saved inventory snapshots</h4>
        <p>Inventory inspection additionally requires <strong>List files</strong> and <strong>Read file contents</strong>. It reads player saves from the configured world's <code>playerdata</code> or <code>players/data</code> directory, using server identities from <code>usercache.json</code>. Missing user-cache entries can prevent online-mode saves from being found by username.</p>
        <p>The read-only viewer shows inventory, equipment, Ender Chest, item metadata, health, food, XP and saved player state. Items may have changed since Minecraft last saved. Refresh reads the snapshot again without forcing a save. No Minecraft plugin or RCON password is required.</p>
        <p>Health and hunger use Minecraft heart and food icons. Experience shows a green progress bar from the saved XP fraction, with the level displayed separately. HUD textures are bundled with the addon; missing values remain labelled unknown or unavailable.</p>
        <p>Vanilla items show native Minecraft inventory images, including 3D blocks, from <a href="https://github.com/Owen1212055/mc-assets" target="_blank" rel="noreferrer">mc-assets</a> via jsDelivr. Modded items and unavailable images use category icons. Custom resource-pack models and metadata-based visual variants use the default item image.</p>
        <p>Lists refresh every 15 seconds while visible, with a shared 10-second server cache. The addon uses existing panel dependencies and does not write player files.</p>
    </div>
</div>
