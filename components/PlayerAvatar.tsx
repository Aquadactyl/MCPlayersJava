import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNitroIdentity, nitroIdentityKey, nitroImage } from "./nitrocraft";

export function PixelAvatar({ name }: { name: string }) {
  const hash = [...name].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
  const colors = ["#79b0a0", "#89a1c6", "#b79dca", "#c4a879", "#adbc82", "#c68e8e"];
  return (
    <svg className="mcp-avatar" viewBox="0 0 8 8" aria-hidden="true" shapeRendering="crispEdges">
      <path fill={colors[hash % colors.length]} d="M0 0h8v8H0z" />
      <path fill="#ffffff" opacity=".15" d="M0 0h8v2H0zM0 2h1v6H0z" />
      <path fill="#182221" d="M1 3h2v1H1zM5 3h2v1H5zM3 5h2v1H3z" />
      <path fill="#182221" opacity=".3" d="M0 7h8v1H0z" />
    </svg>
  );
}

export default function PlayerAvatar({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!window.IntersectionObserver) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const identity = useQuery({
    queryKey: nitroIdentityKey(name),
    queryFn: ({ signal }) => getNitroIdentity(name, signal),
    enabled: visible,
    staleTime: 1200000,
    gcTime: 3600000,
    retry: false,
  });
  return (
    <span ref={ref} className="mcp-avatar-wrap">
      <PixelAvatar name={String(name)} />
      {identity.data && !failed && (
        <img
          className="mcp-avatar mcp-skin"
          src={nitroImage(identity.data.id)}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
