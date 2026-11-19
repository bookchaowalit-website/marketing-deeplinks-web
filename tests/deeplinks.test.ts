import { describe, expect, it } from "vitest";
import { EMPTY_DRAFT, SEED, addRoute, filterRoutes, parseRoutes, removeRoute, restoreRoute } from "@/lib/deeplinks";

describe("filterRoutes", () => {
  it("returns every route for an empty query", () => {
    expect(filterRoutes(SEED, "")).toHaveLength(SEED.length);
  });

  it("matches title, URL and status case-insensitively", () => {
    expect(filterRoutes(SEED, "SHARE").map((r) => r.id)).toEqual(["2"]);
    expect(filterRoutes(SEED, "app://").map((r) => r.id)).toEqual(["1"]);
    expect(filterRoutes(SEED, "active").map((r) => r.id)).toEqual(["1"]);
    expect(filterRoutes(SEED, "nothing here")).toEqual([]);
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(filterRoutes(SEED, "  share  ").map((r) => r.id)).toEqual(["2"]);
  });
});

describe("addRoute", () => {
  it("adds a new route first with the given id and time", () => {
    const next = addRoute(SEED, { title: "Invite", url: "app://invite/{code}", status: "Active" }, "x", 5);
    expect(next?.[0]).toEqual({ id: "x", title: "Invite", url: "app://invite/{code}", status: "Active", createdAt: 5 });
    expect(next).toHaveLength(SEED.length + 1);
  });

  it("refuses a draft without a name or URL", () => {
    expect(addRoute(SEED, EMPTY_DRAFT, "x", 5)).toBeNull();
    expect(addRoute(SEED, { ...EMPTY_DRAFT, title: "  ", url: "app://a" }, "x", 5)).toBeNull();
  });

  it("stores the name and URL without stray whitespace", () => {
    const next = addRoute([], { title: "  Invite ", url: " app://invite ", status: "Draft" }, "x", 5);
    expect(next?.[0]).toMatchObject({ title: "Invite", url: "app://invite" });
  });
});

describe("removeRoute", () => {
  it("removes only the matching id", () => {
    expect(removeRoute(SEED, "1").map((r) => r.id)).toEqual(["2"]);
    expect(removeRoute(SEED, "nope")).toEqual(SEED);
  });
});

describe("parseRoutes", () => {
  it("reads a saved registry back, including an empty one", () => {
    expect(parseRoutes(JSON.stringify(SEED))).toEqual(SEED);
    expect(parseRoutes("[]")).toEqual([]);
  });

  it("rejects corrupt or wrongly shaped storage instead of crashing the page", () => {
    expect(parseRoutes("not json")).toBeNull();
    expect(parseRoutes("{}")).toBeNull();
    expect(parseRoutes(JSON.stringify([{ id: "1", title: "A", url: 3, status: "Draft", createdAt: 1 }]))).toBeNull();
    expect(parseRoutes(JSON.stringify([{ id: "1", title: "A", url: "a://", status: "Gone", createdAt: 1 }]))).toBeNull();
  });
});

describe("restoreRoute", () => {
  it("puts a removed route back at its old place, once", () => {
    const [first, second] = SEED;
    expect(restoreRoute([second], first, 0)).toEqual([first, second]);
    expect(restoreRoute([second], first, 9)).toEqual([second, first]);
    expect(restoreRoute([first, second], first, 0)).toEqual([first, second]);
  });

  it("prefers the old neighbours over the old index", () => {
    const r = (id: string) => ({ ...SEED[0], id, title: id });
    const [x, a, b, c] = [r("x"), r("a"), r("b"), r("c")];
    // B sat at index 1 between A and C; X was added on top meanwhile.
    expect(restoreRoute([x, a, c], b, 1, { prevId: "a", nextId: "c" })).toEqual([x, a, b, c]);
    expect(restoreRoute([x, c], b, 1, { prevId: "a", nextId: "c" })).toEqual([x, b, c]);
    expect(restoreRoute([x], b, 1, { prevId: "a", nextId: "c" })).toEqual([x, b]);
  });
});
