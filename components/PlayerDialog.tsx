import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  Crown,
  LoaderCircle,
  RefreshCw,
  Shield,
  UserRound,
} from "lucide-react";
import { Dialog } from "@/components/elements/dialog";
import Button from "@/components/elements/Button";
import Input from "@/components/elements/Input";
import { httpErrorToHuman } from "@/api/http";
import { getInventory, Player, PlayerAction, PlayerCapabilities, sendPlayerAction } from "./api";
import { getNitroIdentity, nitroIdentityKey, nitroImage, NITROCRAFT } from "./nitrocraft";
import InventoryView from "./InventoryView";
import PlayerAvatar from "./PlayerAvatar";

export const actions: {
  action: PlayerAction;
  label: string;
  description: string;
  owner?: boolean;
  reason?: boolean;
}[] = [
  {
    action: "kick",
    label: "Kick",
    description: "Disconnect this player from the server. They can rejoin.",
    reason: true,
  },
  {
    action: "ban",
    label: "Ban",
    description: "Ban this player until an administrator unbans them.",
    reason: true,
  },
  { action: "pardon", label: "Unban", description: "Remove this player's username ban." },
  {
    action: "op",
    label: "OP",
    description: "Grant operator permissions, including powerful server commands.",
    owner: true,
  },
  {
    action: "deop",
    label: "De-OP",
    description: "Remove operator permissions from this player.",
    owner: true,
  },
  {
    action: "whitelist_add",
    label: "Add to whitelist",
    description: "Allow this player to join when the whitelist is enabled.",
  },
  {
    action: "whitelist_remove",
    label: "Remove from whitelist",
    description: "Remove this player from the whitelist.",
  },
];

export default function PlayerDialog({
  uuid,
  player,
  capabilities,
  onClose,
  onNotice,
}: {
  uuid: string;
  player: Player;
  capabilities: PlayerCapabilities;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const [tab, setTab] = useState<"profile" | "inventory">("profile");
  const [action, setAction] = useState<PlayerAction | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [renderFailed, setRenderFailed] = useState(false);
  const client = useQueryClient();
  const identity = useQuery({
    queryKey: nitroIdentityKey(player.name),
    queryFn: ({ signal }) => getNitroIdentity(player.name, signal),
    staleTime: 1200000,
    gcTime: 3600000,
    retry: false,
  });
  const inventory = useQuery({
    queryKey: ["mcplayers:inventory", uuid, player.name, player.uuid],
    queryFn: ({ signal }) => getInventory(uuid, player, signal),
    enabled: tab === "inventory" && capabilities.inventory,
    staleTime: 10000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const definition = actions.find((entry) => entry.action === action);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!action || busy) return;
    setBusy(true);
    setError("");
    try {
      await sendPlayerAction(uuid, player.name, action, reason);
      const message = `${definition?.label} command for ${player.name} submitted. Check the console for Minecraft's response.`;
      setSubmitted(message);
      onNotice(message);
      setAction(null);
      setReason("");
      void client.invalidateQueries({ queryKey: ["mcplayers", uuid] });
      void client.invalidateQueries({ queryKey: ["mcplayers:inventory", uuid, player.name] });
    } catch (failure) {
      setError(httpErrorToHuman(failure));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      title={definition ? `${definition.label} ${player.name}` : player.name}
      description={
        definition ? definition.description : "Player profile, saved inventory and server actions."
      }
      onClose={() => {
        if (!busy) onClose();
      }}
      preventExternalClose={busy}
      hideCloseIcon={busy}
    >
      <div className="mcp-player-dialog">
        {definition ? (
          <form onSubmit={(event) => void submit(event)} className="mcp-confirm-action">
            <div className="mcp-alert mcp-alert-warning">
              <AlertTriangle size={18} aria-hidden />
              <div>
                <strong>{definition.description}</strong>
                <p>
                  This sends a command to this Minecraft server. It runs when the server is online.
                </p>
              </div>
            </div>
            {definition.reason && (
              <label className="mcp-reason">
                Reason (optional)
                <Input
                  autoFocus
                  maxLength={120}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Enter a reason…"
                />
              </label>
            )}
            {error && (
              <p className="mcp-tool-error" role="alert">
                {error}
              </p>
            )}
            <div className="mcp-dialog-actions">
              <Button
                isSecondary
                type="button"
                disabled={busy}
                onClick={() => {
                  setAction(null);
                  setError("");
                  setReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                color={action === "ban" || action === "op" ? "red" : "primary"}
                type="submit"
                disabled={busy}
              >
                <span className="mcp-button-content">
                  {busy && <LoaderCircle size={15} className="mcp-spin" aria-hidden />}Confirm{" "}
                  {definition.label}
                </span>
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="mcp-profile-header">
              <PlayerAvatar name={player.name} />
              <div>
                <strong>{player.name}</strong>
                <p>Minecraft Java player</p>
              </div>
            </div>
            <div className="mcp-dialog-tabs" role="tablist" aria-label="Player details">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "profile"}
                aria-controls="mcp-profile-panel"
                id="mcp-profile-tab"
                onClick={() => setTab("profile")}
              >
                <UserRound size={15} aria-hidden />
                Profile & actions
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "inventory"}
                aria-controls="mcp-inventory-panel"
                id="mcp-inventory-tab"
                disabled={!capabilities.inventory}
                title={
                  !capabilities.inventory
                    ? "Requires file read and file content permissions"
                    : undefined
                }
                onClick={() => setTab("inventory")}
              >
                <BookOpen size={15} aria-hidden />
                Saved inventory
              </button>
            </div>
            {submitted && (
              <p className="mcp-submitted" role="status">
                {submitted}
              </p>
            )}
            {tab === "profile" ? (
              <div id="mcp-profile-panel" role="tabpanel" aria-labelledby="mcp-profile-tab">
                <div className="mcp-profile-render">
                  {identity.data && !renderFailed ? (
                    <img
                      src={nitroImage(identity.data.id, true)}
                      alt={`${player.name}'s Minecraft skin`}
                      referrerPolicy="no-referrer"
                      onError={() => setRenderFailed(true)}
                    />
                  ) : (
                    <span>
                      {identity.isPending ? "Loading Nitrocraft skin…" : "Skin render unavailable"}
                    </span>
                  )}
                </div>
                <p className="mcp-nitro-credit">
                  Skins and profiles by{" "}
                  <a href={NITROCRAFT} target="_blank" rel="noreferrer">
                    Nitrocraft
                  </a>
                  .
                </p>
                {identity.data && <p className="mcp-player-uuid">Skin UUID: {identity.data.id}</p>}
                {capabilities.moderate && (
                  <>
                    <h3 className="mcp-tools-title">
                      <Shield size={16} aria-hidden />
                      Server actions
                    </h3>
                    <div className="mcp-action-grid">
                      {actions
                        .filter((entry) => !entry.owner || capabilities.operator)
                        .map((entry) => (
                          <Button
                            key={entry.action}
                            color="grey"
                            type="button"
                            onClick={() => {
                              setAction(entry.action);
                              setError("");
                              setSubmitted("");
                            }}
                          >
                            {entry.label}
                          </Button>
                        ))}
                    </div>
                    {!capabilities.operator && (
                      <p className="mcp-permission-note">
                        <Crown size={13} aria-hidden />
                        Only the server owner and panel admins can OP or de-OP players.
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div id="mcp-inventory-panel" role="tabpanel" aria-labelledby="mcp-inventory-tab">
                <div className="mcp-inventory-heading">
                  <h3>Saved inventory</h3>
                  <Button
                    size="xsmall"
                    color="grey"
                    disabled={inventory.isFetching}
                    onClick={() => void inventory.refetch()}
                    aria-label="Refresh saved inventory"
                  >
                    <RefreshCw
                      size={14}
                      className={inventory.isFetching ? "mcp-spin" : ""}
                      aria-hidden
                    />
                  </Button>
                </div>
                {inventory.isError && (
                  <p className="mcp-tool-error" role="alert">
                    {httpErrorToHuman(inventory.error)}
                    {inventory.data &&
                      " The previous snapshot is shown below; this refresh failed."}
                  </p>
                )}
                {inventory.isPending ? (
                  <div className="mcp-empty">
                    <LoaderCircle size={25} className="mcp-spin" aria-hidden />
                    <p>Reading saved player data…</p>
                  </div>
                ) : inventory.data ? (
                  <InventoryView data={inventory.data} />
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
