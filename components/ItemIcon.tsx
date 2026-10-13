import React, { useState } from "react";
import { Apple, BookOpen, Boxes, Gem, Package, Pickaxe, Shield, Shirt, Sword } from "lucide-react";

// Minecraft 26.3 inventory renders, pinned to a fixed revision rather than a moving branch.
export const ITEM_RENDER_SOURCE = "https://github.com/Owen1212055/mc-assets";
export const ITEM_RENDER_BASE =
  "https://cdn.jsdelivr.net/gh/Owen1212055/mc-assets@bc96011714c0eb3770bd641a3b86459ad5f860c7/item-assets";

export function minecraftItemImage(id: string): string | null {
  const match = /^minecraft:([a-z0-9_]{1,100})$/u.exec(id);
  return match ? `${ITEM_RENDER_BASE}/${match[1].toUpperCase()}.png` : null;
}

const fallbackIcon = (id: string) =>
  /sword|trident|mace/u.test(id) ? (
    <Sword size={22} />
  ) : /pickaxe|axe|shovel|hoe/u.test(id) ? (
    <Pickaxe size={22} />
  ) : /helmet|chestplate|leggings|boots/u.test(id) ? (
    <Shirt size={22} />
  ) : /shield/u.test(id) ? (
    <Shield size={22} />
  ) : /diamond|emerald|quartz/u.test(id) ? (
    <Gem size={22} />
  ) : /apple|bread|beef|carrot|potato|porkchop/u.test(id) ? (
    <Apple size={22} />
  ) : /book/u.test(id) ? (
    <BookOpen size={22} />
  ) : /chest|shulker/u.test(id) ? (
    <Boxes size={22} />
  ) : (
    <Package size={22} />
  );

export default function ItemIcon({ id }: { id: string }) {
  const src = minecraftItemImage(id);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const available = src !== null && failedSource !== src;
  const loaded = available && loadedSource === src;

  return (
    <span className="mcp-item-art" aria-hidden="true">
      {!loaded && fallbackIcon(id)}
      {available && (
        <img
          key={src}
          className={`mcp-item-texture ${loaded ? "mcp-item-texture-loaded" : ""}`}
          src={src}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          decoding="async"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={() => setLoadedSource(src)}
          onError={() => setFailedSource(src)}
        />
      )}
    </span>
  );
}
