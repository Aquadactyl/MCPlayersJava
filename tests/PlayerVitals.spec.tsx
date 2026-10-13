import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import PlayerVitals from "@blueprint/extensions/mcplayers/PlayerVitals";

afterEach(cleanup);
const vitals = { health: 18.5, food: 19, xp_level: 12, xp_progress: 0.375 };

describe("Minecraft saved player HUD", () => {
  it("renders half hearts, hunger from right to left, and real XP progress", () => {
    render(<PlayerVitals data={vitals} />);
    const health = screen.getByRole("meter", { name: "Health" });
    const food = screen.getByRole("meter", { name: "Food" });
    expect(health.querySelectorAll('[data-fill="full"]')).toHaveLength(9);
    expect(health.querySelectorAll('[data-fill="half"]')).toHaveLength(1);
    expect(health.getAttribute("aria-valuenow")).toBe("18.5");
    expect(food.querySelectorAll('[data-fill="full"]')).toHaveLength(9);
    expect(food.firstElementChild?.getAttribute("data-fill")).toBe("half");
    expect(screen.getByText("18.5 HP")).toBeTruthy();
    const xp = screen.getByRole("progressbar", { name: "Experience" });
    expect(xp.getAttribute("aria-valuenow")).toBe("37.5");
    expect(xp.getAttribute("aria-valuetext")).toBe("Level 12, 37.5% to next level");
    expect((xp.querySelector(".mcp-xp-fill") as HTMLElement).style.clipPath).toBe(
      "inset(0 62.5% 0 0)",
    );
  });

  it("distinguishes zero values from missing values", () => {
    render(<PlayerVitals data={{ health: 0, food: 0, xp_level: 0, xp_progress: 0 }} />);
    expect(
      screen.getByRole("meter", { name: "Health" }).querySelectorAll('[data-fill="empty"]'),
    ).toHaveLength(10);
    expect(screen.getByRole("meter", { name: "Food" }).getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByText("0 HP")).toBeTruthy();
    expect(screen.queryByText("Progress unavailable")).toBeNull();
  });

  it("does not fabricate XP progress from a saved level or older API response", () => {
    render(<PlayerVitals data={{ health: null, food: null, xp_level: 25 }} />);
    expect(screen.queryAllByRole("meter")).toHaveLength(0);
    expect(screen.getAllByText("Unknown")).toHaveLength(2);
    expect(screen.getByText("25")).toBeTruthy();
    expect(screen.getByText("Progress unavailable")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBeNull();
    expect(document.querySelector(".mcp-xp-fill")).toBeNull();
  });

  it("rejects invalid or non-finite vitals in the display", () => {
    const { rerender } = render(
      <PlayerVitals data={{ health: NaN, food: 30, xp_level: -1, xp_progress: Infinity }} />,
    );
    expect(screen.queryAllByRole("meter")).toHaveLength(0);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBeNull();
    rerender(<PlayerVitals data={{ health: -1, food: -1, xp_level: 2.5, xp_progress: 1.5 }} />);
    expect(screen.queryAllByRole("meter")).toHaveLength(0);
    expect(document.querySelector(".mcp-xp-fill")).toBeNull();
  });

  it("shows extra health as additional hearts without overflowing into food", () => {
    render(<PlayerVitals data={{ ...vitals, health: 32.5 }} />);
    const health = screen.getByRole("meter", { name: "Health" });
    expect(health.querySelectorAll('[data-fill="full"]')).toHaveLength(16);
    expect(health.querySelectorAll('[data-fill="half"]')).toHaveLength(1);
    expect(screen.getByText("32.5 HP")).toBeTruthy();
    expect(screen.getByRole("meter", { name: "Food" }).children).toHaveLength(10);
  });

  it("updates the meters when a refreshed snapshot changes", () => {
    const { rerender } = render(
      <PlayerVitals data={{ ...vitals, health: 20, xp_level: 9000, xp_progress: 0.25 }} />,
    );
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("25");
    rerender(<PlayerVitals data={{ ...vitals, health: 1, food: 20, xp_progress: 1 }} />);
    expect(
      screen.getByRole("meter", { name: "Health" }).querySelectorAll('[data-fill="half"]'),
    ).toHaveLength(1);
    expect(
      screen.getByRole("meter", { name: "Health" }).querySelectorAll('[data-fill="empty"]'),
    ).toHaveLength(9);
    expect(
      screen.getByRole("meter", { name: "Food" }).querySelectorAll('[data-fill="full"]'),
    ).toHaveLength(10);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
  });
});
