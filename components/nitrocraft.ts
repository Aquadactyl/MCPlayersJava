export const NITROCRAFT = "https://nitrocraft.uk";
export interface NitroIdentity {
  id: string;
  name: string;
}

export async function getNitroIdentity(name: string, signal?: AbortSignal): Promise<NitroIdentity> {
  if (!/^[A-Za-z0-9_]{1,16}$/u.test(name)) throw new Error("Invalid Minecraft username.");
  const timeout = AbortSignal.timeout(8000);
  const response = await fetch(`${NITROCRAFT}/players/${encodeURIComponent(name)}`, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error("Nitrocraft player lookup is unavailable.");
  const text = await response.text();
  if (text.length > 32768) throw new Error("Unexpected Nitrocraft response.");
  const data: unknown = JSON.parse(text);
  if (!data || typeof data !== "object") throw new Error("Invalid Nitrocraft identity.");
  const identity = data as Partial<NitroIdentity>;
  const id = typeof identity.id === "string" ? identity.id.replaceAll("-", "") : null;
  if (
    !id ||
    !/^[0-9a-f]{32}$/iu.test(id) ||
    typeof identity.name !== "string" ||
    !/^[A-Za-z0-9_]{1,16}$/u.test(identity.name)
  ) {
    throw new Error("Invalid Nitrocraft identity.");
  }
  return { id: id.toLowerCase(), name: identity.name };
}

export const nitroIdentityKey = (name: string) => ["mcplayers:nitrocraft", name.toLowerCase()];

export function nitroImage(id: string, body = false) {
  if (!/^[0-9a-f]{32}$/iu.test(id)) throw new Error("Invalid skin UUID.");
  return body
    ? `${NITROCRAFT}/renders/body/${id}?scale=4&overlay`
    : `${NITROCRAFT}/avatars/${id}?size=80&overlay`;
}
