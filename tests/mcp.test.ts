import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/mcp/route";

function rpc(body: unknown) {
  return POST(new Request("http://localhost/api/mcp", { method: "POST", body: JSON.stringify(body) }));
}

describe("MCP route", () => {
  it("echoes the JSON-RPC request id", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 7, method: "tools/list" });
    expect((await res.json()).id).toBe(7);
  });

  it("lists the real tools", async () => {
    const { result } = await (await rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" })).json();
    expect(result.tools.map((t: { name: string }) => t.name)).toEqual(["get_seed_routes", "get_by_id", "search"]);
  });

  it("get_seed_routes returns the sample registry", async () => {
    const { result } = await (await rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_seed_routes" } })).json();
    expect(result.routes.map((r: { url: string }) => r.url)).toEqual(["app://projects/{id}", "book://notes/{slug}?ref=share"]);
  });

  it("search filters by name, URL or status", async () => {
    const { result } = await (await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "search", arguments: { query: "draft" } } })).json();
    expect(result.routes.map((r: { id: string }) => r.id)).toEqual(["2"]);
  });

  it("get_by_id returns an error for an unknown id", async () => {
    const body = await (await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "get_by_id", arguments: { id: "nope" } } })).json();
    expect(body.error.code).toBe(-32602);
    expect(body.id).toBe(4);
  });

  it("rejects an unknown tool instead of pretending to call it", async () => {
    const body = await (await rpc({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "open_in_app" } })).json();
    expect(body.error.code).toBe(-32602);
  });

  it("rejects an unknown method and bad JSON", async () => {
    expect((await (await rpc({ jsonrpc: "2.0", id: 6, method: "nope" })).json()).error.code).toBe(-32601);
    const res = await POST(new Request("http://localhost/api/mcp", { method: "POST", body: "{" }));
    expect((await res.json()).error.code).toBe(-32700);
  });
});
