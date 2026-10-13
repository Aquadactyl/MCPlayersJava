import http from "@/api/http";

export interface Player {
  name: string;
  uuid: string | null;
}

export interface PlayerList {
  status: "available" | "unavailable" | "unsupported" | "pending";
  source: "query" | "status" | null;
  complete: boolean;
  online: number | null;
  maximum: number | null;
  players: Player[];
  checked_at: string | null;
  capabilities?: PlayerCapabilities;
}

export interface PlayerCapabilities {
  moderate: boolean;
  operator: boolean;
  inventory: boolean;
}

export type PlayerAction =
  | "kick"
  | "ban"
  | "pardon"
  | "op"
  | "deop"
  | "whitelist_add"
  | "whitelist_remove";

export interface InventoryItem {
  slot: number;
  id: string;
  count: number;
  metadata: unknown;
  metadata_truncated: boolean;
}

export interface InventorySnapshot {
  source: "saved_file";
  player: string;
  uuid: string;
  saved_at: string | null;
  read_at: string;
  inventory: InventoryItem[];
  ender_chest: InventoryItem[];
  health: number | null;
  food: number | null;
  xp_level: number | null;
  selected_slot: number | null;
  dimension: string | null;
  position: number[] | null;
  data_version: number | null;
  state: { operator: boolean | null; banned: boolean | null; whitelisted: boolean | null };
}

export async function getPlayers(uuid: string, signal?: AbortSignal): Promise<PlayerList> {
  const { data } = await http.get<{ attributes: PlayerList }>(
    `/api/client/extensions/mcplayers/servers/${uuid}/players`,
    { signal },
  );
  return data.attributes;
}

export async function sendPlayerAction(
  uuid: string,
  name: string,
  action: PlayerAction,
  reason = "",
) {
  await http.post(
    `/api/client/extensions/mcplayers/servers/${uuid}/players/${encodeURIComponent(name)}/actions`,
    {
      action,
      reason: reason || null,
      confirmed: true,
    },
  );
}

export async function getInventory(
  uuid: string,
  player: Player,
  signal?: AbortSignal,
): Promise<InventorySnapshot> {
  const { data } = await http.get<{ attributes: InventorySnapshot }>(
    `/api/client/extensions/mcplayers/servers/${uuid}/players/${encodeURIComponent(player.name)}/inventory`,
    { params: player.uuid ? { uuid: player.uuid } : undefined, signal },
  );
  return data.attributes;
}
