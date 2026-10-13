import React, { useState } from "react";
import {
  Apple,
  BookOpen,
  Boxes,
  Crown,
  Gem,
  Package,
  Pickaxe,
  Shield,
  Shirt,
  Sword,
} from "lucide-react";
import { InventoryItem, InventorySnapshot } from "./api";

const itemName = (id: string) =>
  id
    .split(":")
    .at(-1)!
    .replaceAll("_", " ")
    .replace(/\b\w/gu, (char) => char.toUpperCase());
const icon = (id: string) =>
  /sword|trident|mace/u.test(id)
    ? Sword
    : /pickaxe|axe|shovel|hoe/u.test(id)
      ? Pickaxe
      : /helmet|chestplate|leggings|boots/u.test(id)
        ? Shirt
        : /shield/u.test(id)
          ? Shield
          : /diamond|emerald|quartz/u.test(id)
            ? Gem
            : /apple|bread|beef|carrot|potato|porkchop/u.test(id)
              ? Apple
              : /book/u.test(id)
                ? BookOpen
                : /chest|shulker/u.test(id)
                  ? Boxes
                  : Package;

export default function InventoryView({ data }: { data: InventorySnapshot }) {
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const grid = (title: string, slots: number[], items: InventoryItem[], equipment = false) => (
    <section className="mcp-inventory-section">
      <h3>{title}</h3>
      <div className={`mcp-slot-grid ${equipment ? "mcp-equipment-grid" : ""}`}>
        {slots.map((slot) => {
          const item = items.find((entry) => entry.slot === slot);
          const Icon = item ? icon(item.id) : Package;
          const label = equipment
            ? (
                { 103: "Head", 102: "Chest", 101: "Legs", 100: "Feet", 150: "Offhand" } as Record<
                  number,
                  string
                >
              )[slot]
            : `Slot ${slot}`;
          return (
            <div key={slot} className="mcp-slot-wrap">
              <button
                type="button"
                className={`mcp-slot ${!equipment && title === "Hotbar" && data.selected_slot === slot ? "mcp-slot-held" : ""}`}
                disabled={!item}
                aria-label={`${label}: ${item ? `${itemName(item.id)} × ${item.count}` : "Empty"}`}
                title={`${label}: ${item ? `${itemName(item.id)} × ${item.count}` : "Empty"}`}
                onClick={() => setSelected(item ?? null)}
              >
                {item && (
                  <>
                    <Icon size={22} aria-hidden />
                    <span>{item.count}</span>
                  </>
                )}
              </button>
              {equipment && <small>{label}</small>}
            </div>
          );
        })}
      </div>
    </section>
  );
  const saved =
    data.saved_at && Number.isFinite(new Date(data.saved_at).getTime())
      ? new Date(data.saved_at).toLocaleString()
      : "Unknown save time";
  return (
    <div className="mcp-inventory-view">
      <div className="mcp-alert">
        <BookOpen size={18} aria-hidden />
        <div>
          <strong>Saved inventory snapshot</strong>
          <p>
            {saved}. Items may have changed since Minecraft last saved this player. This view is
            read-only.
          </p>
        </div>
      </div>
      <div className="mcp-player-vitals">
        <span>
          Health <strong>{data.health ?? "—"}</strong>
        </span>
        <span>
          Food <strong>{data.food ?? "—"}</strong>
        </span>
        <span>
          XP level <strong>{data.xp_level ?? "—"}</strong>
        </span>
      </div>
      {grid("Equipment", [103, 102, 101, 100, 150], data.inventory, true)}
      {grid(
        "Main inventory",
        Array.from({ length: 27 }, (_, index) => index + 9),
        data.inventory,
      )}
      {grid(
        "Hotbar",
        Array.from({ length: 9 }, (_, index) => index),
        data.inventory,
      )}
      {grid(
        "Ender Chest",
        Array.from({ length: 27 }, (_, index) => index),
        data.ender_chest,
      )}
      {selected && (
        <section className="mcp-item-details">
          <h3>
            {itemName(selected.id)} × {selected.count}
          </h3>
          <code>{selected.id}</code>
          <p>Slot {selected.slot}</p>
          {selected.metadata_truncated ? (
            <p>Item metadata exceeds the display limit.</p>
          ) : (
            <pre>{JSON.stringify(selected.metadata, null, 2)}</pre>
          )}
        </section>
      )}
      <div className="mcp-saved-state">
        <Crown size={15} aria-hidden />
        {(
          [
            ["operator", "OP"],
            ["banned", "Banned"],
            ["whitelisted", "Whitelisted"],
          ] as const
        ).map(([key, label]) => (
          <span key={key}>
            {label}: {data.state[key] === null ? "Unknown" : data.state[key] ? "Yes" : "No"}
          </span>
        ))}
      </div>
      <p className="mcp-player-location">
        {data.dimension ?? "Unknown dimension"}
        {data.position ? ` · ${data.position.join(", ")}` : ""}
      </p>
      <p className="mcp-player-uuid">Server UUID: {data.uuid}</p>
    </div>
  );
}
