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
        <p>Lists refresh every 15 seconds while visible, with a shared 10-second server cache. No Minecraft plugin, RCON password, external player API or additional panel dependency is required.</p>
    </div>
</div>
