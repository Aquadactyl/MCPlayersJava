import { GameDig } from "gamedig";
import { pathToFileURL } from "node:url";

export const unavailable = () => ({
  status: "unavailable",
  source: null,
  complete: false,
  online: null,
  maximum: null,
  players: [],
});

export function validTarget(target) {
  return (
    target !== null &&
    typeof target === "object" &&
    ["queryHost", "statusHost"].every(
      (key) =>
        typeof target[key] === "string" &&
        target[key].length > 0 &&
        target[key].length <= 253 &&
        !/[\s/\\]/u.test(target[key]) &&
        [...target[key]].every((character) => character.charCodeAt(0) > 31),
    ) &&
    ["queryPort", "statusPort"].every(
      (key) => Number.isInteger(target[key]) && target[key] > 0 && target[key] <= 65535,
    )
  );
}

export function normalize(result, source) {
  if (
    ![result.numplayers, result.maxplayers].every(
      (count) => Number.isInteger(count) && count >= 0 && count <= 1000000,
    )
  ) {
    throw new Error("Invalid player count");
  }
  const seen = new Set();
  const players = [];
  for (const player of (result.players ?? []).slice(0, 10000)) {
    if (typeof player.name !== "string" || !/^[A-Za-z0-9_]{1,16}$/u.test(player.name)) continue;
    const key = player.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const id = player.id ?? player.raw?.id;
    const uuid =
      typeof id === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/iu.test(id)
        ? id.toLowerCase()
        : null;
    players.push({ name: player.name, uuid });
  }
  players.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "en"));
  return {
    status: "available",
    source,
    // Java status is a sample, even when it happens to contain every player.
    complete: source === "query" && players.length === result.numplayers,
    online: result.numplayers,
    maximum: result.maxplayers,
    players,
  };
}

export async function queryPlayers(target, query = (options) => GameDig.query(options)) {
  if (!validTarget(target)) return unavailable();
  const options = {
    givenPortOnly: true,
    maxRetries: 0,
    socketTimeout: 900,
    attemptTimeout: 1800,
    requestPlayers: true,
    requestRules: false,
    portCache: false,
  };
  try {
    const result = await query({
      ...options,
      type: "protocol-gamespy3",
      host: target.queryHost,
      port: target.queryPort,
    });
    // Other games also speak GameSpy. Do not list a non-Minecraft reply.
    if (String(result.raw?.gamename).toLowerCase() !== "minecraft")
      throw new Error("Not Minecraft");
    return normalize(result, "query");
  } catch {
    try {
      return normalize(
        await query({
          ...options,
          type: "protocol-minecraftvanilla",
          host: target.statusHost,
          port: target.statusPort,
        }),
        "status",
      );
    } catch {
      return unavailable();
    }
  }
}

async function main() {
  const finish = (result) => {
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  };
  const timer = setTimeout(() => finish(unavailable()), 4500);
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 4096) return finish(unavailable());
  }
  try {
    const result = await queryPlayers(JSON.parse(input));
    clearTimeout(timer);
    finish(result);
  } catch {
    finish(unavailable());
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
