import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PlayerDialog from "@blueprint/extensions/mcplayers/PlayerDialog";
import {
  getInventory,
  sendPlayerAction,
  InventorySnapshot,
  PlayerCapabilities,
} from "@blueprint/extensions/mcplayers/api";

vi.mock("@/api/http", () => ({ httpErrorToHuman: (error: Error) => error.message }));
vi.mock("@blueprint/extensions/mcplayers/api", () => ({
  getInventory: vi.fn(),
  sendPlayerAction: vi.fn(),
}));
vi.mock("@blueprint/extensions/mcplayers/nitrocraft", () => ({
  NITROCRAFT: "https://nitrocraft.uk",
  nitroIdentityKey: (name: string) => ["test:nitrocraft", name],
  getNitroIdentity: vi
    .fn()
    .mockResolvedValue({ id: "d634462bd663401d9788a8596307bc4d", name: "Alex" }),
  nitroImage: () =>
    "https://nitrocraft.uk/renders/body/d634462bd663401d9788a8596307bc4d?scale=4&overlay",
}));
vi.mock("@blueprint/extensions/mcplayers/PlayerAvatar", () => ({ default: () => null }));

const saved: InventorySnapshot = {
  source: "saved_file",
  player: "Alex",
  uuid: "36532b5e-c442-3dbb-a24c-c7e55d0f979a",
  saved_at: "2026-10-13T12:00:00Z",
  read_at: "2026-10-13T12:01:00Z",
  inventory: [
    {
      slot: 0,
      id: "minecraft:diamond_sword",
      count: 1,
      metadata: { display: { Name: "<script>alert(1)</script>" } },
      metadata_truncated: false,
    },
    { slot: 9, id: "minecraft:stone", count: 64, metadata: {}, metadata_truncated: false },
    {
      slot: 103,
      id: "minecraft:diamond_helmet",
      count: 1,
      metadata: {},
      metadata_truncated: false,
    },
    { slot: 150, id: "minecraft:shield", count: 1, metadata: {}, metadata_truncated: false },
  ],
  ender_chest: [
    { slot: 0, id: "minecraft:emerald", count: 7, metadata: {}, metadata_truncated: false },
  ],
  health: 18,
  food: 20,
  xp_level: 25,
  selected_slot: 0,
  dimension: "minecraft:overworld",
  position: [12, 64, -10],
  data_version: 4189,
  state: { operator: true, banned: false, whitelisted: null },
};
let client: QueryClient;
let onNotice = vi.fn<(message: string) => void>();
const mount = (
  capabilities: PlayerCapabilities = { moderate: true, operator: true, inventory: true },
) =>
  render(
    <QueryClientProvider client={client}>
      <PlayerDialog
        uuid="test-server"
        player={{ name: "Alex", uuid: null }}
        capabilities={capabilities}
        onClose={vi.fn()}
        onNotice={onNotice}
      />
    </QueryClientProvider>,
  );
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  onNotice = vi.fn();
  vi.mocked(getInventory).mockResolvedValue(saved);
  vi.mocked(sendPlayerAction).mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.clearAllMocks();
});

describe("player management dialog", () => {
  it("requires confirmation before dispatch and preserves the reason", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Ban" }));
    expect(sendPlayerAction).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "Reason (optional)" }), {
      target: { value: "Griefing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Ban" }));
    await screen.findByText(
      "Ban command for Alex submitted. Check the console for Minecraft's response.",
    );
    expect(sendPlayerAction).toHaveBeenCalledExactlyOnceWith(
      "test-server",
      "Alex",
      "ban",
      "Griefing",
    );
    expect(onNotice).toHaveBeenCalledTimes(1);
  });

  it("cancels a kick without sending a command", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Kick" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Kick" })).toBeTruthy();
    expect(sendPlayerAction).not.toHaveBeenCalled();
  });

  it("keeps failed actions recoverable and reports no successful submission", async () => {
    vi.mocked(sendPlayerAction).mockRejectedValue(new Error("Server unavailable"));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "OP" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm OP" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Server unavailable");
    expect(onNotice).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Confirm OP" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("prevents duplicate submissions while waiting for Wings", async () => {
    let finish!: () => void;
    vi.mocked(sendPlayerAction).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Unban" }));
    const confirm = screen.getByRole("button", { name: "Confirm Unban" }) as HTMLButtonElement;
    fireEvent.click(confirm);
    expect(confirm.disabled).toBe(true);
    fireEvent.click(confirm);
    expect(sendPlayerAction).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(onNotice).toHaveBeenCalledTimes(1));
  });

  it("hides operator actions from subusers and locks inventory without file access", () => {
    mount({ moderate: true, operator: false, inventory: false });
    expect(screen.queryByRole("button", { name: "OP" })).toBeNull();
    expect(screen.queryByRole("button", { name: "De-OP" })).toBeNull();
    expect(
      screen.getByText("Only the server owner and panel admins can OP or de-OP players."),
    ).toBeTruthy();
    expect(
      (screen.getByRole("tab", { name: "Saved inventory" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(getInventory).not.toHaveBeenCalled();
  });

  it("hides all actions when moderation permission is absent", () => {
    mount({ moderate: false, operator: false, inventory: false });
    expect(screen.queryByRole("button", { name: "Ban" })).toBeNull();
    expect(screen.queryByText("Server actions")).toBeNull();
  });

  it("loads snapshots only on opening the inventory tab and displays actual server UUID", async () => {
    mount();
    expect(getInventory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "Saved inventory" }));
    await screen.findByText("Saved inventory snapshot");
    expect(getInventory).toHaveBeenCalledWith(
      "test-server",
      { name: "Alex", uuid: null },
      expect.any(AbortSignal),
    );
    expect(screen.getByText(`Server UUID: ${saved.uuid}`)).toBeTruthy();
    expect(screen.getByText(/This view is read-only/)).toBeTruthy();
    expect(screen.getByText("Whitelisted: Unknown")).toBeTruthy();
  });

  it("renders equipment, hotbar and Ender Chest with safe item metadata", async () => {
    mount();
    fireEvent.click(screen.getByRole("tab", { name: "Saved inventory" }));
    await screen.findByRole("button", { name: "Head: Diamond Helmet × 1" });
    expect(screen.getByRole("button", { name: "Offhand: Shield × 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Slot 9: Stone × 64" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Slot 0: Emerald × 7" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Slot 0: Diamond Sword × 1" }));
    expect(screen.getByText("minecraft:diamond_sword")).toBeTruthy();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeTruthy();
    expect(document.querySelector(".mcp-item-details script")).toBeNull();
  });

  it("labels the previous snapshot after a failed refresh", async () => {
    mount();
    fireEvent.click(screen.getByRole("tab", { name: "Saved inventory" }));
    await screen.findByText("Saved inventory snapshot");
    vi.mocked(getInventory).mockRejectedValue(new Error("File read denied"));
    fireEvent.click(screen.getByRole("button", { name: "Refresh saved inventory" }));
    await screen.findByText(/The previous snapshot is shown below; this refresh failed/);
    expect(screen.getByText("Saved inventory snapshot")).toBeTruthy();
  });

  it("reports missing files without inventing an empty inventory", async () => {
    vi.mocked(getInventory).mockRejectedValue(new Error("No saved inventory was found."));
    mount();
    fireEvent.click(screen.getByRole("tab", { name: "Saved inventory" }));
    await screen.findByText("No saved inventory was found.");
    expect(screen.queryByText("Saved inventory snapshot")).toBeNull();
  });

  it("supports keyboard navigation between tabs", async () => {
    mount();
    const profile = screen.getByRole("tab", { name: "Profile & actions" });
    fireEvent.keyDown(profile, { key: "End" });
    await screen.findByText("Saved inventory snapshot");
    const inventory = screen.getByRole("tab", { name: "Saved inventory" });
    expect(inventory.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(inventory);
    fireEvent.keyDown(inventory, { key: "Home" });
    expect(profile.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(profile);
  });
});
