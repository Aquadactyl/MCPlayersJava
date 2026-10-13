import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getNitroIdentity,
  nitroIdentityKey,
  nitroImage,
} from "@blueprint/extensions/mcplayers/nitrocraft";

const id = "d634462bd663401d9788a8596307bc4d";
const fetchMock = vi.fn();
const reply = (data: unknown, ok = true) => ({ ok, text: async () => JSON.stringify(data) });
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(reply({ id, name: "RepGraphics" }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("Nitrocraft public API integration", () => {
  it("resolves validated identities without sending panel credentials", async () => {
    expect(await getNitroIdentity("RepGraphics")).toEqual({ id, name: "RepGraphics" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://nitrocraft.uk/players/RepGraphics",
      expect.objectContaining({
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it("normalizes dashed UUIDs and shares the username cache case-insensitively", async () => {
    fetchMock.mockResolvedValue(
      reply({ id: "D634462B-D663-401D-9788-A8596307BC4D", name: "RepGraphics" }),
    );
    expect((await getNitroIdentity("repgraphics")).id).toBe(id);
    expect(nitroIdentityKey("RepGraphics")).toEqual(nitroIdentityKey("repgraphics"));
  });
  it("rejects invalid usernames before making any external request", async () => {
    await expect(getNitroIdentity("Alex/../Steve")).rejects.toThrow("Invalid Minecraft username");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects unavailable, oversized and malformed identity responses", async () => {
    fetchMock.mockResolvedValueOnce(reply({}, false));
    await expect(getNitroIdentity("Alex")).rejects.toThrow("unavailable");
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => "x".repeat(32769) });
    await expect(getNitroIdentity("Alex")).rejects.toThrow("Unexpected Nitrocraft response");
    for (const data of [
      null,
      { id: 12, name: "Alex" },
      { id: "bad", name: "Alex" },
      { id, name: "<Alex>" },
    ]) {
      fetchMock.mockResolvedValueOnce(reply(data));
      await expect(getNitroIdentity("Alex")).rejects.toThrow("Invalid Nitrocraft identity");
    }
  });
  it("keeps caller cancellation on the request signal", async () => {
    const controller = new AbortController();
    await getNitroIdentity("Alex", controller.signal);
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    controller.abort();
    expect(signal.aborted).toBe(true);
  });
  it("constructs only Nitrocraft avatar and body URLs", () => {
    expect(nitroImage(id)).toBe(`https://nitrocraft.uk/avatars/${id}?size=80&overlay`);
    expect(nitroImage(id, true)).toBe(`https://nitrocraft.uk/renders/body/${id}?scale=4&overlay`);
    expect(() => nitroImage("https://attacker.invalid/image")).toThrow("Invalid skin UUID");
  });
});
