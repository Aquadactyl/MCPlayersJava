import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import ItemIcon, {
  minecraftItemImage,
  ITEM_RENDER_BASE,
} from "@blueprint/extensions/mcplayers/ItemIcon";

afterEach(cleanup);

describe("Minecraft inventory item images", () => {
  it("maps vanilla tools and blocks to fixed inventory renders", () => {
    expect(minecraftItemImage("minecraft:diamond_sword")).toBe(
      `${ITEM_RENDER_BASE}/DIAMOND_SWORD.png`,
    );
    expect(minecraftItemImage("minecraft:stone")).toBe(`${ITEM_RENDER_BASE}/STONE.png`);
    expect(minecraftItemImage("minecraft:copper_pickaxe")).toBe(
      `${ITEM_RENDER_BASE}/COPPER_PICKAXE.png`,
    );
    expect(ITEM_RENDER_BASE).toContain("@bc96011714c0eb3770bd641a3b86459ad5f860c7/");
  });

  it("does not construct remote URLs for modded or unsafe item IDs", () => {
    for (const id of [
      "mod:diamond_sword",
      "minecraft:../stone",
      "minecraft:stone?x=1",
      "minecraft:stone\n",
      "https://other.invalid/stone",
      "minecraft:Stone",
    ]) {
      expect(minecraftItemImage(id)).toBeNull();
    }
    const { container } = render(<ItemIcon id="mod:diamond_sword" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("retains the fallback while loading and swaps it for the image", () => {
    const { container } = render(<ItemIcon id="minecraft:diamond_sword" />);
    const img = container.querySelector("img")!;
    expect(container.querySelector("svg")).toBeTruthy();
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("crossorigin")).toBe("anonymous");
    expect(img.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(img.getAttribute("alt")).toBe("");
    fireEvent.load(img);
    expect(img.classList.contains("mcp-item-texture-loaded")).toBe(true);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("keeps a usable fallback after missing images or CDN failure", () => {
    const { container } = render(<ItemIcon id="minecraft:unavailable_item" />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("loads a changed slot's new item after the previous image failed", () => {
    const { container, rerender } = render(<ItemIcon id="minecraft:unavailable_item" />);
    fireEvent.error(container.querySelector("img")!);
    rerender(<ItemIcon id="minecraft:emerald" />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe(`${ITEM_RENDER_BASE}/EMERALD.png`);
    expect(img.classList.contains("mcp-item-texture-loaded")).toBe(false);
    fireEvent.load(img);
    expect(container.querySelector("svg")).toBeNull();
  });
});
