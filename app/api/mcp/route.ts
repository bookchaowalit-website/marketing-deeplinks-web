import { NextResponse } from "next/server";
import { SEED, filterRoutes } from "@/lib/deeplinks";

// Stateless JSON-RPC MCP endpoint over the sample routes the page starts with. Routes a visitor adds live only in
// their browser's localStorage, so this endpoint cannot see them. It does not open or resolve any link.

type RpcRequest = { id?: number | string | null; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };

const TOOLS = [
  { name: "get_seed_routes", description: "List the sample deep link routes the page starts with", inputSchema: { type: "object", properties: {} } },
  { name: "get_by_id", description: "Get one sample route by id", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "search", description: "Search sample routes by name, URL or status", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
];

class RpcError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
  }
}

function callTool(name: string | undefined, args: Record<string, unknown> = {}) {
  switch (name) {
    case "get_seed_routes":
      return { routes: SEED };
    case "get_by_id": {
      const route = SEED.find((entry) => entry.id === args.id);
      if (!route) throw new RpcError(-32602, `No route with id ${String(args.id)}`);
      return { route };
    }
    case "search":
      return { routes: filterRoutes(SEED, typeof args.query === "string" ? args.query : "") };
    default:
      throw new RpcError(-32602, `Unknown tool: ${String(name)}`);
  }
}

export async function POST(request: Request) {
  let id: RpcRequest["id"] = null;
  try {
    const body = (await request.json()) as RpcRequest;
    id = body.id ?? null;
    let result: unknown;
    switch (body.method) {
      case "initialize":
        result = { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "Deep Links registry", version: "1.0.0" } };
        break;
      case "tools/list":
        result = { tools: TOOLS };
        break;
      case "tools/call":
        result = callTool(body.params?.name, body.params?.arguments);
        break;
      default:
        throw new RpcError(-32601, `Unknown method: ${String(body.method)}`);
    }
    return NextResponse.json({ jsonrpc: "2.0", id, result });
  } catch (error) {
    const code = error instanceof RpcError ? error.code : -32700;
    const message = error instanceof RpcError ? error.message : "Parse error";
    return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status: 400 });
  }
}
