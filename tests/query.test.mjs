import assert from "node:assert/strict";
import { test } from "node:test";
import dgram from "node:dgram";
import net from "node:net";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { normalize, queryPlayers, validTarget } from "../private/query.mjs";

function varint(value) {
  const bytes = [];
  do {
    let byte = value & 127;
    value >>>= 7;
    if (value) byte |= 128;
    bytes.push(byte);
  } while (value);
  return Buffer.from(bytes);
}

async function fixtures(
  t,
  {
    names = ["Steve", "Alex"],
    online = names.length,
    sample = ["Steve"],
    game = "MINECRAFT",
    gameKey = "game_id",
    udp = true,
  } = {},
) {
  const query = dgram.createSocket("udp4");
  const status = net.createServer((socket) => {
    socket.once("data", () => {
      const json = Buffer.from(
        JSON.stringify({
          version: { name: "1.21.4", protocol: 769 },
          players: {
            max: 30,
            online,
            sample: sample.map((name) => ({ name, id: "069a79f4-44e9-4726-a5be-fca90e38aaf5" })),
          },
          description: { text: "Fixture" },
        }),
      );
      const payload = Buffer.concat([Buffer.from([0]), varint(json.length), json]);
      socket.end(Buffer.concat([varint(payload.length), payload]));
    });
  });
  query.on("message", (message, remote) => {
    if (!udp) return;
    const session = message.subarray(3, 7);
    const type = message[2];
    if (type === 9)
      query.send(
        Buffer.concat([Buffer.from([9]), session, Buffer.from("123456\0")]),
        remote.port,
        remote.address,
      );
    if (type === 0) {
      const values = Buffer.from(
        [
          "hostname",
          "Fixture",
          "gametype",
          "SMP",
          gameKey,
          game,
          "version",
          "1.21.4",
          "plugins",
          "",
          "map",
          "world",
          "numplayers",
          String(online),
          "maxplayers",
          "30",
          "hostport",
          "25565",
          "hostip",
          "127.0.0.1",
          "",
          "",
        ].join("\0"),
        "utf8",
      );
      const players = Buffer.from(
        `\x01player_\0\0${names.length ? names.join("\0") + "\0" : ""}\0`,
        "utf8",
      );
      query.send(
        Buffer.concat([
          Buffer.from([0]),
          session,
          Buffer.from("splitnum\0"),
          Buffer.from([128, 0]),
          values,
          players,
        ]),
        remote.port,
        remote.address,
      );
    }
  });
  query.bind(0, "127.0.0.1");
  status.listen(0, "127.0.0.1");
  await Promise.all([once(query, "listening"), once(status, "listening")]);
  t.after(() =>
    Promise.all([
      new Promise((resolve) => query.close(resolve)),
      new Promise((resolve) => status.close(resolve)),
    ]),
  );
  return {
    queryHost: "127.0.0.1",
    queryPort: query.address().port,
    statusHost: "127.0.0.1",
    statusPort: status.address().port,
  };
}

test("queries real UDP full lists on a separate port from TCP status", async (t) => {
  const names = [
    "Steve",
    "Alex",
    "Builder_3",
    "Notch",
    "Miner",
    "Crafty",
    "Diamond",
    "Herobrine",
    "Fox",
    "Bee",
    "Ender",
    "Creeper",
  ];
  const result = await queryPlayers(await fixtures(t, { names }));
  assert.equal(result.status, "available");
  assert.equal(result.source, "query");
  assert.equal(result.complete, true);
  assert.equal(result.online, 12);
  assert.equal(result.players.length, 12);
  assert.equal(result.players[0].name, "Alex");
  assert.equal(result.players[0].uuid, null);
});

test("full Query with zero players is available and complete", async (t) => {
  const result = await queryPlayers(await fixtures(t, { names: [], sample: [] }));
  assert.equal(result.status, "available");
  assert.equal(result.source, "query");
  assert.equal(result.online, 0);
  assert.equal(result.complete, true);
  assert.deepEqual(result.players, []);
});

test("also accepts the legacy gamename Minecraft identifier", async (t) => {
  const result = await queryPlayers(await fixtures(t, { gameKey: "gamename" }));
  assert.equal(result.source, "query");
  assert.equal(result.complete, true);
  assert.deepEqual(
    result.players.map((player) => player.name),
    ["Alex", "Steve"],
  );
});

test("a non-Minecraft game_id cannot be overridden by a legacy gamename", async () => {
  const calls = [];
  const result = await queryPlayers(
    { queryHost: "localhost", queryPort: 25565, statusHost: "localhost", statusPort: 25565 },
    async (options) => {
      calls.push(options.type);
      return {
        numplayers: 0,
        maxplayers: 20,
        players: [],
        raw: { game_id: "OTHER", gamename: "MINECRAFT" },
      };
    },
  );
  assert.deepEqual(calls, ["protocol-gamespy3", "protocol-minecraftvanilla"]);
  assert.equal(result.source, "status");
  assert.equal(result.complete, false);
});

test("falls back to a labelled TCP sample when UDP Query is disabled", async (t) => {
  const result = await queryPlayers(
    await fixtures(t, { udp: false, online: 12, sample: ["Steve", "Alex"] }),
  );
  assert.equal(result.source, "status");
  assert.equal(result.complete, false);
  assert.equal(result.online, 12);
  assert.equal(result.players.length, 2);
  assert.equal(result.players[0].uuid, "069a79f4-44e9-4726-a5be-fca90e38aaf5");
});

test("never claims a status sample is complete even when counts match", async (t) => {
  const result = await queryPlayers(
    await fixtures(t, { udp: false, names: ["Steve"], sample: ["Steve"] }),
  );
  assert.equal(result.complete, false);
  assert.equal(result.online, result.players.length);
});

test("hidden names do not change the reported online count", async (t) => {
  const result = await queryPlayers(await fixtures(t, { udp: false, online: 8, sample: [] }));
  assert.equal(result.status, "available");
  assert.equal(result.online, 8);
  assert.deepEqual(result.players, []);
  assert.equal(result.complete, false);
});

test("a partial Query reply remains labelled partial", async (t) => {
  const result = await queryPlayers(await fixtures(t, { names: ["Alex"], online: 5 }));
  assert.equal(result.source, "query");
  assert.equal(result.complete, false);
});

test("rejects non-Minecraft GameSpy replies and tries Java status", async (t) => {
  const result = await queryPlayers(await fixtures(t, { game: "OTHER", sample: ["Alex"] }));
  assert.equal(result.source, "status");
});

test("names are validated, deduplicated and sorted; unsafe UUIDs are discarded", () => {
  const result = normalize(
    {
      numplayers: 7,
      maxplayers: 30,
      players: [
        { name: "Steve" },
        { name: "alex", id: "<script>" },
        { name: "ALEX" },
        { name: "<script>" },
        { name: "Ignore\nMe" },
        { name: "a".repeat(17) },
        { name: "Build_12" },
      ],
    },
    "query",
  );
  assert.deepEqual(result.players, [
    { name: "alex", uuid: null },
    { name: "Build_12", uuid: null },
    { name: "Steve", uuid: null },
  ]);
  assert.equal(result.online, 7);
  assert.equal(result.complete, false);
});

test("validates hosts and assigned ports before performing network requests", async () => {
  const base = {
    queryHost: "127.0.0.1",
    queryPort: 25565,
    statusHost: "localhost",
    statusPort: 25566,
  };
  assert.equal(validTarget(base), true);
  for (const target of [
    null,
    {},
    { ...base, queryPort: 0 },
    { ...base, queryPort: 65536 },
    { ...base, statusPort: "25565" },
    { ...base, queryHost: "localhost/path" },
    { ...base, statusHost: "host\nname" },
  ]) {
    assert.equal(validTarget(target), false);
    const result = await queryPlayers(target, () => {
      assert.fail("Invalid targets must not query");
    });
    assert.equal(result.status, "unavailable");
  }
});

test("malformed counts and failed queries become unavailable", async () => {
  assert.throws(() => normalize({ numplayers: -1, maxplayers: 20 }, "query"));
  assert.throws(() => normalize({ numplayers: 2, maxplayers: Infinity }, "status"));
  const result = await queryPlayers(
    { queryHost: "localhost", queryPort: 1, statusHost: "localhost", statusPort: 1 },
    async () => {
      throw new Error("Offline");
    },
  );
  assert.equal(result.status, "unavailable");
  assert.equal(result.online, null);
  assert.deepEqual(result.players, []);
});

test("CLI returns one JSON response for malformed or oversized input", async () => {
  for (const input of ["{broken", "x".repeat(5000)]) {
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL("../private/query.mjs", import.meta.url))],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let output = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      output += chunk;
    });
    child.stdin.end(input);
    const [code] = await once(child, "exit");
    assert.equal(code, 0);
    assert.equal(JSON.parse(output).status, "unavailable");
  }
});
