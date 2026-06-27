import type { DisplayLocationKey } from "../types/locations.types";

// Badge.displayLocations is stored as a JSON-encoded array (or null, meaning
// "every shop-enabled location") — mirrors the same string-column-as-JSON
// convention DisplayRule.value already uses.
export function parseBadgeDisplayLocations(raw: string | null): DisplayLocationKey[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DisplayLocationKey[]) : null;
  } catch {
    return null;
  }
}

export function serializeBadgeDisplayLocations(keys: DisplayLocationKey[] | null): string | null {
  return keys ? JSON.stringify(keys) : null;
}
