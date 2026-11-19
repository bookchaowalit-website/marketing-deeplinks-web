// Pure logic for the local deep link registry. The page and the MCP route both use it.

export const STATUSES = ["Draft", "Active", "Done"] as const;
export type Status = (typeof STATUSES)[number];
export type Route = { id: string; title: string; url: string; status: Status; createdAt: number };
export type Draft = { title: string; url: string; status: Status };

export const STORAGE_KEY = "deeplinks-v1";
export const EMPTY_DRAFT: Draft = { title: "", url: "", status: "Draft" };

const DAY = 86_400_000;
const SEEDED_AT = Date.UTC(2026, 9, 1);

export const SEED: Route[] = [
  { id: "1", title: "Open project", url: "app://projects/{id}", status: "Active", createdAt: SEEDED_AT - DAY },
  { id: "2", title: "Share note", url: "book://notes/{slug}?ref=share", status: "Draft", createdAt: SEEDED_AT - 2 * DAY },
];

export function filterRoutes(routes: Route[], query: string): Route[] {
  const needle = query.trim().toLowerCase();
  return routes.filter((route) => `${route.title} ${route.url} ${route.status}`.toLowerCase().includes(needle));
}

export function addRoute(routes: Route[], draft: Draft, id: string, now: number): Route[] | null {
  const title = draft.title.trim();
  const url = draft.url.trim();
  if (!title || !url) return null;
  return [{ id, title, url, status: draft.status, createdAt: now }, ...routes];
}

export function removeRoute(routes: Route[], id: string): Route[] {
  return routes.filter((item) => item.id !== id);
}

export function isStatus(value: unknown): value is Status {
  return STATUSES.includes(value as Status);
}

function isRoute(value: unknown): value is Route {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.url === "string" &&
    isStatus(item.status) &&
    typeof item.createdAt === "number"
  );
}

// Saved state comes from the visitor's browser: anything that is not a list of routes is ignored.
export function parseRoutes(raw: string): Route[] | null {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) && value.every(isRoute) ? value : null;
  } catch {
    return null;
  }
}

/** The ids around a route in the stored list when it was removed, so Undo can find its place again. */
export type Neighbours = { prevId?: string; nextId?: string };

/**
 * Puts a removed route back at its old position (Undo); a route with the same id already back stays single.
 * The place is found from its neighbours when they are still listed (links added meanwhile go on top and
 * would shift a bare index), else from the old index.
 */
export function restoreRoute(routes: Route[], route: Route, index: number, neighbours: Neighbours = {}): Route[] {
  if (routes.some((item) => item.id === route.id)) return routes;
  const prevAt = neighbours.prevId ? routes.findIndex((item) => item.id === neighbours.prevId) : -1;
  const nextAt = neighbours.nextId ? routes.findIndex((item) => item.id === neighbours.nextId) : -1;
  const at = prevAt >= 0 ? prevAt + 1 : nextAt >= 0 ? nextAt : Math.max(0, Math.min(index, routes.length));
  return [...routes.slice(0, at), route, ...routes.slice(at)];
}
