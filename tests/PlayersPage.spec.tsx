import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PlayersPage from "@blueprint/extensions/mcplayers/PlayersPage";
import { getPlayers } from "@blueprint/extensions/mcplayers/api";

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) => selector({ server: { data: { uuid: "test-server" } } }),
  },
}));
vi.mock("@/components/elements/ServerContentBlock", () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/api/http", () => ({ httpErrorToHuman: (error: Error) => error.message }));
vi.mock("@blueprint/extensions/mcplayers/api", () => ({ getPlayers: vi.fn() }));
vi.mock("@blueprint/extensions/mcplayers/PlayerAvatar", () => ({ default: () => null }));
vi.mock("@blueprint/extensions/mcplayers/PlayerDialog", () => ({
  default: ({ player, onClose }: { player: { name: string }; onClose: () => void }) => (
    <div role="dialog" aria-label={player.name}>
      <button onClick={onClose}>Close profile</button>
    </div>
  ),
}));

const snapshot = (changes = {}) => ({
  status: "available" as const,
  source: "query" as const,
  complete: true,
  online: 2,
  maximum: 30,
  players: [
    { name: "Alex", uuid: null },
    { name: "Steve", uuid: null },
  ],
  checked_at: "2026-10-13T12:00:00+01:00",
  ...changes,
});
let client: QueryClient;
const mount = () =>
  render(
    <QueryClientProvider client={client}>
      <PlayersPage />
    </QueryClientProvider>,
  );

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  vi.mocked(getPlayers).mockResolvedValue(snapshot());
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("installed Minecraft Players page", () => {
  it("renders real names and filters case-insensitively", async () => {
    mount();
    await screen.findByText("Alex");
    expect(screen.getByText("Steve")).toBeTruthy();
    expect(screen.getByText("full list")).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search players" }), {
      target: { value: " aLeX " },
    });
    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.queryByText("Steve")).toBeNull();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Nobody" } });
    expect(screen.getByText("No matching players")).toBeTruthy();
  });

  it("labels samples even when names and reported player counts match", async () => {
    vi.mocked(getPlayers).mockResolvedValue(snapshot({ source: "status", complete: false }));
    mount();
    await screen.findByText("These names are a status sample.");
    expect(screen.queryByText("full list")).toBeNull();
  });

  it("distinguishes hidden player names from an empty server", async () => {
    vi.mocked(getPlayers).mockResolvedValue(
      snapshot({ online: 8, players: [], complete: false, source: "status" }),
    );
    mount();
    await screen.findByText("Player names are hidden");
    expect(screen.queryByText("No players online")).toBeNull();
    expect((screen.getByRole("button", { name: "Copy names" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("renders the zero-player and unreachable states", async () => {
    vi.mocked(getPlayers).mockResolvedValue(snapshot({ online: 0, players: [] }));
    mount();
    await screen.findByText("No players online");
    vi.mocked(getPlayers).mockResolvedValue(
      snapshot({ status: "unavailable", players: [], online: null }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh player list" }));
    await screen.findByText("Your server could not be reached");
    expect(screen.queryByText("No players online")).toBeNull();
  });

  it("does not present previous cached names as current after refresh fails", async () => {
    mount();
    await screen.findByText("Alex");
    vi.mocked(getPlayers).mockRejectedValue(new Error("Access denied"));
    fireEvent.click(screen.getByRole("button", { name: "Refresh player list" }));
    await screen.findByText("Could not update the player list.");
    expect(screen.getByText("Last reported players")).toBeTruthy();
    expect(screen.getByText("Last reported online")).toBeTruthy();
    expect(screen.queryByText("Online")).toBeNull();
  });

  it("copies one name and the complete returned list", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    mount();
    await screen.findByText("Alex");
    fireEvent.click(screen.getByRole("button", { name: "Copy Alex" }));
    await screen.findByText("Alex copied.");
    expect(writeText).toHaveBeenLastCalledWith("Alex");
    fireEvent.click(screen.getByRole("button", { name: "Copy names" }));
    await screen.findByText("Player names copied.");
    expect(writeText).toHaveBeenLastCalledWith("Alex\nSteve");
  });

  it("handles clipboard denial with a useful recovery message", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) },
    });
    mount();
    await screen.findByText("Alex");
    fireEvent.click(screen.getByRole("button", { name: "Copy Alex" }));
    expect(
      await screen.findByText("Copy failed. Select the name and copy it manually."),
    ).toBeTruthy();
  });

  it("stops polling when auto-refresh is switched off", async () => {
    mount();
    await screen.findByText("Alex");
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("checkbox", { name: "Auto-refresh every 15s" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16000);
    });
    expect(getPlayers).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("shows unsupported servers without misleading counts", async () => {
    vi.mocked(getPlayers).mockResolvedValue(
      snapshot({ status: "unsupported", online: null, maximum: null, players: [] }),
    );
    mount();
    await screen.findByText("Minecraft Java servers only");
    expect(screen.queryByText("Players online")).toBeNull();
  });

  it("opens a listed player's profile and closes it", async () => {
    mount();
    await screen.findByText("Alex");
    fireEvent.click(screen.getByRole("button", { name: "Manage Alex" }));
    expect(screen.getByRole("dialog", { name: "Alex" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close profile" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens offline usernames and rejects command characters", async () => {
    vi.mocked(getPlayers).mockResolvedValue(
      snapshot({
        capabilities: { moderate: true, operator: false, inventory: false },
      }),
    );
    mount();
    const input = await screen.findByRole("textbox", {
      name: "Open any player, including offline players",
    });
    fireEvent.change(input, { target: { value: "Offline_Alex" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByRole("dialog", { name: "Offline_Alex" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close profile" }));
    fireEvent.change(input, { target: { value: "Alex;stop" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
