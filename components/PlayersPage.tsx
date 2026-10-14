import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Info,
  LoaderCircle,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Users,
  WifiOff,
  UserRoundCog,
} from "lucide-react";
import { ServerContext } from "@/state/server";
import ServerContentBlock from "@/components/elements/ServerContentBlock";
import Button from "@/components/elements/Button";
import Input from "@/components/elements/Input";
import { httpErrorToHuman } from "@/api/http";
import { getPlayers, Player } from "./api";
import PlayerAvatar from "./PlayerAvatar";
import PlayerDialog from "./PlayerDialog";
import "./players.css";

export default function PlayersPage() {
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const [search, setSearch] = useState("");
  const [automatic, setAutomatic] = useState(true);
  const [notice, setNotice] = useState("");
  const [lookup, setLookup] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  useEffect(() => {
    setSelectedPlayer(null);
  }, [uuid]);
  const query = useQuery({
    queryKey: ["mcplayers", uuid],
    queryFn: ({ signal }) => getPlayers(uuid, signal),
    staleTime: 10000,
    retry: false,
    refetchInterval: (current) => {
      if (!automatic || current.state.data?.status === "unsupported") return false;
      const status = (current.state.error as { response?: { status?: number } } | null)?.response
        ?.status;
      if (status && [401, 403, 404, 409, 429].includes(status)) return false;
      return current.state.data?.status === "pending" ? 2000 : 15000;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const data = query.data;
  const capabilities = data?.capabilities ?? { moderate: false, operator: false, inventory: false };
  const available = data?.status === "available";
  const unsupported = data?.status === "unsupported";
  const busy = query.isFetching;
  const players = data?.players ?? [];
  const filtered = players.filter((player) =>
    player.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const copy = async (value: string, description: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(description);
    } catch {
      setNotice("Copy failed. Select the name and copy it manually.");
    }
  };
  const updated = data?.checked_at
    ? new Date(data.checked_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;
  const health = query.isError
    ? "Update failed"
    : available
      ? "Online"
      : unsupported
        ? "Unsupported"
        : query.isPending || data?.status === "pending"
          ? "Checking"
          : "Unreachable";

  return (
    <ServerContentBlock title="Java Players">
      <div className="mcp-page">
        <header className="mcp-header">
          <div className="mcp-heading">
            <span className="mcp-heading-icon">
              <Users size={25} aria-hidden />
            </span>
            <div>
              <p className="mcp-eyebrow">Minecraft Java</p>
              <h1>Java Players</h1>
              <p className="mcp-subtitle">Player profiles, server actions and saved inventories.</p>
            </div>
          </div>
          <div className="mcp-header-actions">
            <span
              className={`mcp-status ${available && !query.isError ? "mcp-status-online" : ""}`}
            >
              <span aria-hidden />
              {health}
            </span>
            <Button
              color="grey"
              disabled={busy}
              onClick={() => void query.refetch()}
              aria-label="Refresh player list"
            >
              <span className="mcp-button-content">
                <RefreshCw size={16} className={busy ? "mcp-spin" : ""} aria-hidden />
                Refresh
              </span>
            </Button>
          </div>
        </header>

        {query.isError && (
          <div className="mcp-alert mcp-alert-warning" role="alert">
            <WifiOff size={19} aria-hidden />
            <div>
              <strong>Could not update the player list.</strong>
              <p>
                {httpErrorToHuman(query.error)}{" "}
                {data && "The last result is shown below; it may be out of date."}
              </p>
            </div>
          </div>
        )}

        {!unsupported && (
          <div className="mcp-stats">
            <div className="mcp-stat">
              <Users size={19} aria-hidden />
              <span>{query.isError ? "Last reported online" : "Players online"}</span>
              <strong>
                {available ? data.online : "—"}
                <small> / {available ? data.maximum : "—"}</small>
              </strong>
            </div>
            <div className="mcp-stat">
              <ShieldCheck size={19} aria-hidden />
              <span>Names returned</span>
              <strong>
                {available ? players.length : "—"}
                <small>{available && (data.complete ? "full list" : "partial list")}</small>
              </strong>
            </div>
            <div className="mcp-stat">
              <Server size={19} aria-hidden />
              <span>List source</span>
              <strong className="mcp-stat-source">
                {available ? (data.source === "query" ? "Minecraft Query" : "Server status") : "—"}
                <small>
                  {available
                    ? data.source === "query"
                      ? "UDP query"
                      : "Status sample"
                    : "Waiting for response"}
                </small>
              </strong>
            </div>
          </div>
        )}

        {available && !data.complete && (
          <div className="mcp-alert" role="status">
            <Info size={19} aria-hidden />
            <div>
              <strong>
                {data.source === "status"
                  ? "These names are a status sample."
                  : "The server returned a partial player list."}
              </strong>
              <p>
                {data.source === "status"
                  ? "Minecraft status can hide or limit names, so this may not include everyone online. Enable Query for the full list."
                  : "Some names were missing or could not be displayed. The reported online count is shown above."}
              </p>
            </div>
          </div>
        )}

        {(capabilities.moderate || capabilities.inventory) && (
          <form
            className="mcp-lookup"
            onSubmit={(event) => {
              event.preventDefault();
              const name = lookup.trim();
              if (/^[A-Za-z0-9_]{1,16}$/u.test(name))
                setSelectedPlayer({
                  name,
                  uuid:
                    players.find((player) => player.name.toLowerCase() === name.toLowerCase())
                      ?.uuid ?? null,
                });
            }}
          >
            <label htmlFor="mcp-lookup">Open any player, including offline players</label>
            <div>
              <Input
                id="mcp-lookup"
                value={lookup}
                onChange={(event) => setLookup(event.target.value)}
                placeholder="Minecraft username"
                maxLength={16}
                pattern="[A-Za-z0-9_]{1,16}"
                required
              />
              <Button type="submit" color="grey">
                <span className="mcp-button-content">
                  <UserRoundCog size={16} aria-hidden />
                  Open player
                </span>
              </Button>
            </div>
          </form>
        )}

        <section className="mcp-panel" aria-label="Player list" aria-busy={busy}>
          <div className="mcp-toolbar">
            <div>
              <h2>{query.isError && data ? "Last reported players" : "Player list"}</h2>
              <p>
                {available
                  ? `${players.length} ${players.length === 1 ? "name" : "names"} returned · Sorted A–Z`
                  : "Live names from your Minecraft server"}
              </p>
            </div>
            <div className="mcp-toolbar-actions">
              <label className="mcp-search">
                <Search size={17} aria-hidden />
                <Input
                  type="search"
                  aria-label="Search players"
                  placeholder="Search players…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  disabled={!players.length}
                />
              </label>
              <Button
                isSecondary
                disabled={!players.length}
                onClick={() =>
                  void copy(players.map((player) => player.name).join("\n"), "Player names copied.")
                }
              >
                <span className="mcp-button-content">
                  <Copy size={15} aria-hidden />
                  Copy names
                </span>
              </Button>
            </div>
          </div>

          {query.isPending || data?.status === "pending" ? (
            <div className="mcp-empty">
              <LoaderCircle size={30} className="mcp-spin" aria-hidden />
              <h3>Checking your server</h3>
              <p>Retrieving the latest player list…</p>
            </div>
          ) : unsupported ? (
            <div className="mcp-empty">
              <Server size={30} aria-hidden />
              <h3>Minecraft Java servers only</h3>
              <p>
                Choose a Minecraft Java egg, or select Minecraft Java as the game query type in the
                server's admin settings. A query type of None or globally disabled game queries
                disables player listing.
              </p>
            </div>
          ) : !available ? (
            <div className="mcp-empty">
              <WifiOff size={30} aria-hidden />
              <h3>
                {query.isError ? "Player list unavailable" : "Your server could not be reached"}
              </h3>
              <p>
                {query.isError
                  ? "Try refreshing once access or connectivity is restored."
                  : "The server may be offline, status may be disabled, or a firewall may be blocking the panel. Start the server and check the setup below."}
              </p>
            </div>
          ) : !players.length ? (
            <div className="mcp-empty">
              <Users size={30} aria-hidden />
              <h3>{data.online === 0 ? "No players online" : "Player names are hidden"}</h3>
              <p>
                {data.online === 0
                  ? "Players will appear here when they join your server."
                  : "The server reports players online but returned no displayable names. Enable Query and check your server's player privacy settings."}
              </p>
            </div>
          ) : !filtered.length ? (
            <div className="mcp-empty">
              <Search size={30} aria-hidden />
              <h3>No matching players</h3>
              <p>Try a different player name.</p>
            </div>
          ) : (
            <ul className="mcp-player-grid">
              {filtered.map((player) => (
                <li className="mcp-player" key={player.name.toLowerCase()}>
                  <PlayerAvatar name={player.name} />
                  <div className="mcp-player-info">
                    <strong>{player.name}</strong>
                    <span>{query.isError ? "Last reported" : "Reported online"}</span>
                  </div>
                  <button
                    type="button"
                    className="mcp-copy"
                    onClick={() => void copy(player.name, `${player.name} copied.`)}
                    aria-label={`Copy ${player.name}`}
                    title="Copy username"
                  >
                    <Copy size={16} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="mcp-copy"
                    aria-label={`Manage ${player.name}`}
                    title="Player profile and actions"
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <UserRoundCog size={17} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <footer className="mcp-footer">
            <span>
              {updated ? `Last checked at ${updated}` : "No result yet"}
              {available && search.trim()
                ? ` · Showing ${filtered.length} of ${players.length}`
                : ""}
            </span>
            <label>
              <Input
                type="checkbox"
                checked={automatic}
                onChange={(event) => setAutomatic(event.target.checked)}
              />
              <span>Auto-refresh every 15s</span>
            </label>
          </footer>
        </section>

        <p className="mcp-notice" role="status" aria-live="polite">
          {notice && (
            <>
              <Check size={15} aria-hidden />
              {notice}
            </>
          )}
        </p>

        <p className="mcp-nitro-credit">
          Player skins by{" "}
          <a href="https://nitrocraft.uk" target="_blank" rel="noreferrer">
            Nitrocraft
          </a>
          .
        </p>

        {selectedPlayer && (
          <PlayerDialog
            key={`${uuid}:${selectedPlayer.name}`}
            uuid={uuid}
            player={selectedPlayer}
            capabilities={capabilities}
            onClose={() => setSelectedPlayer(null)}
            onNotice={setNotice}
          />
        )}

        <details className="mcp-setup">
          <summary>
            <Info size={17} aria-hidden />
            Get the full player list
          </summary>
          <div>
            <p>
              Enable Minecraft Query in <code>server.properties</code> and restart the server:
            </p>
            <pre>
              <code>{"enable-query=true\nquery.port=25565"}</code>
            </pre>
            <p>
              Replace <code>25565</code> with your assigned server port. Allow UDP on that port from
              the panel host. If Query uses a separate assigned port, ask an administrator to select
              it under <strong>Query address / port</strong> on this server's admin Details page.
            </p>
            <p>
              The addon uses Query for the full list and TCP status for a labelled sample. Proxies
              need their own Query support enabled. No Minecraft plugin or RCON is required.
            </p>
          </div>
        </details>
      </div>
    </ServerContentBlock>
  );
}
