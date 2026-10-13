#!/usr/bin/env node
// BetterFans Link MCP server for stdio clients.
//
// With no key it serves the public docs: search_docs, get_doc and
// get_agent_setup, plus every docs page as a bfl://docs/ resource.
// With BFL_KEY set it also connects to the hosted server at
// https://mcp.betterfans.link/mcp and passes its tools and prompts through,
// so a client that only speaks stdio gets the same tools as one that
// connects over HTTP. Clients that speak HTTP should connect to the hosted
// server directly: https://betterfans.link/docs/mcp/clients

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  CallToolResultSchema,
  GetPromptRequestSchema,
  GetPromptResultSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolResult,
  type Prompt,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  SITE_URL,
  VERSION,
  docPages,
  docUri,
  normalizeSlug,
  readAgentSetup,
  readDoc,
  readFull,
  readIndex,
  searchDocs,
} from "./docs.js";

const MCP_URL = process.env.BFL_MCP_URL || "https://mcp.betterfans.link/mcp";
const KEY = process.env.BFL_KEY?.trim() || undefined;

// --- The hosted server, when a key is set ---

let remote: Client | undefined;
let remoteProblem: string | undefined;

async function connectRemote(): Promise<void> {
  if (!KEY) return;
  if (KEY.startsWith("bfl_dash_")) {
    remoteProblem = "BFL_KEY is a dashboard key (bfl_dash_). The MCP server refuses those: create a bfl_test_ or bfl_live_ key under Developers.";
    return;
  }
  const client = new Client({ name: "betterfans-mcp", version: VERSION });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${KEY}` } },
  });
  try {
    await client.connect(transport);
    remote = client;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    remoteProblem = /401|invalid_token|unauthori[sz]ed/i.test(message)
      ? "BFL_KEY was refused: it is expired, revoked or unknown. Check it under Developers, then API keys."
      : `Could not reach ${MCP_URL}: ${message}`;
  }
}

// Names the hosted server answers, refreshed on every tools/list.
let hostedNames = new Set<string>();

async function remoteTools(): Promise<Tool[]> {
  if (!remote) return [];
  const tools: Tool[] = [];
  let cursor: string | undefined;
  do {
    const page = await remote.listTools(cursor ? { cursor } : undefined);
    tools.push(...page.tools);
    cursor = page.nextCursor;
  } while (cursor);
  hostedNames = new Set(tools.map((t) => t.name));
  return tools;
}

async function remotePrompts(): Promise<Prompt[]> {
  if (!remote?.getServerCapabilities()?.prompts) return [];
  const prompts: Prompt[] = [];
  let cursor: string | undefined;
  do {
    const page = await remote.listPrompts(cursor ? { cursor } : undefined);
    prompts.push(...page.prompts);
    cursor = page.nextCursor;
  } while (cursor);
  return prompts;
}

// --- Docs tools that need no key ---

const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

const localTools: Tool[] = [
  {
    name: "search_docs",
    title: "Search docs",
    description: "Search BetterFans Link documentation and guides: the OnlyFans and Fansly API, the MCP server, webhooks, keys, test mode and errors.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1, maxLength: 200, description: "What you want to know, for example: verify webhook signatures." },
        limit: { type: "integer", minimum: 1, maximum: 10, description: "How many pages to return. Default 5." },
      },
      required: ["query"],
    },
    annotations: readOnly,
  },
  {
    name: "get_doc",
    title: "Get doc",
    description: "Read one documentation page as markdown.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", minLength: 1, maxLength: 300, description: "Page slug from search_docs, for example get-started/quickstart-api. A docs URL or bfl://docs/ URI works too." },
      },
      required: ["slug"],
    },
    annotations: readOnly,
  },
  {
    name: "get_agent_setup",
    title: "Get agent setup",
    description: "Setup steps for an AI agent: how a person creates a workspace and a test key, and how to connect a client to the hosted BetterFans Link MCP server.",
    inputSchema: { type: "object", properties: {} },
    annotations: readOnly,
  },
];

function text(t: string): CallToolResult {
  return { content: [{ type: "text", text: t }] };
}

function toolError(code: string, message: string, hint: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: `${code}: ${message}\nHint: ${hint}` }] };
}

async function callLocal(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  switch (name) {
    case "search_docs": {
      const query = typeof args.query === "string" ? args.query.trim() : "";
      if (!query) return toolError("invalid_parameter", "query is required.", "Pass a few words, for example: webhook signatures.");
      const limit = typeof args.limit === "number" ? Math.min(10, Math.max(1, Math.trunc(args.limit))) : 5;
      const hits = searchDocs(await docPages(), query, limit);
      const results = hits.map((p) => ({ slug: p.slug, title: p.title, description: p.description, url: p.url, uri: docUri(p.slug) }));
      const lines = results.length
        ? results.map((r) => `- ${r.title} (slug ${r.slug}): ${r.description} ${r.url}`).join("\n") + "\n\nRead a page with get_doc."
        : `No docs page matches "${query}". Try other words.`;
      return {
        content: [{ type: "text", text: lines }],
        structuredContent: { query, results },
      };
    }
    case "get_doc": {
      const slug = typeof args.slug === "string" ? normalizeSlug(args.slug) : undefined;
      if (!slug) return toolError("invalid_parameter", "slug must look like get-started/quickstart-api.", "Find pages with search_docs.");
      const doc = await readDoc(slug);
      if (!doc) return toolError("not_found", `No docs page has the slug ${slug}.`, "Find pages with search_docs.");
      return { content: [{ type: "text", text: doc.markdown }], structuredContent: doc };
    }
    case "get_agent_setup":
      return text(await readAgentSetup());
    default:
      return toolError("unknown_tool", `No tool is called ${name}.`, "List the tools again.");
  }
}

// --- Server ---

function instructions(): string {
  const remoteInstructions = remote?.getInstructions();
  if (remoteInstructions) return remoteInstructions;
  const lines = [
    "BetterFans Link is an API and MCP server for agencies that manage OnlyFans and Fansly creators.",
    "This server is running without a key, so it only has the public docs: search_docs, get_doc and get_agent_setup.",
    "To read chats, fans and revenue, a person creates a workspace at https://betterfans.link/sign-up and a test key under Developers, then sets it as BFL_KEY for this server, or connects the client to https://mcp.betterfans.link/mcp directly. Never ask them to paste a key into the chat.",
  ];
  if (remoteProblem) lines.push(`The key was not used: ${remoteProblem}`);
  return lines.join("\n");
}

async function main(): Promise<void> {
  await connectRemote();
  if (remote) await remoteTools().catch(() => undefined);
  if (remoteProblem) console.error(`[betterfans-mcp] ${remoteProblem} Serving the docs tools only.`);

  const server = new Server(
    { name: "betterfans-link", title: "BetterFans Link", version: VERSION, websiteUrl: "https://betterfans.link" },
    { capabilities: { tools: {}, resources: {}, prompts: {} }, instructions: instructions() },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const hosted = await remoteTools();
    // The hosted server has its own search_docs and get_doc; its copy wins.
    return { tools: [...hosted, ...localTools.filter((t) => !hostedNames.has(t.name))] };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const isLocal = localTools.some((t) => t.name === name);
    if (remote && (!isLocal || hostedNames.has(name))) {
      return remote.request({ method: "tools/call", params: request.params }, CallToolResultSchema);
    }
    if (!isLocal) {
      return toolError(
        "missing_key",
        `${name} needs a BetterFans Link key.`,
        "Set BFL_KEY to a bfl_test_ or bfl_live_ key for this server. See get_agent_setup.",
      );
    }
    try {
      return await callLocal(name, args);
    } catch (err) {
      return toolError("upstream_error", err instanceof Error ? err.message : String(err), "betterfans.link may be unreachable. Try again shortly.");
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: await remotePrompts() }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    if (!remote) throw new Error("Prompts need a BetterFans Link key. Set BFL_KEY.");
    return remote.request({ method: "prompts/get", params: request.params }, GetPromptResultSchema);
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      { uri: "bfl://llms.txt", name: "llms.txt", title: "Docs outline", description: "What BetterFans Link is, how to start, and every docs page with a one-line summary.", mimeType: "text/plain" },
      ...(await docPages()).map((p) => ({ uri: docUri(p.slug), name: p.slug, title: p.title, description: p.description, mimeType: "text/markdown" })),
    ],
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [
      { uriTemplate: "bfl://docs/{+slug}", name: "docs-page", title: "Docs page", description: "One documentation page as markdown, for example bfl://docs/get-started/quickstart-api.", mimeType: "text/markdown" },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    // betterfans://docs/index and betterfans://docs/full are the 1.x names.
    if (uri === "bfl://llms.txt" || uri === "betterfans://docs/index") {
      return { contents: [{ uri, mimeType: "text/plain", text: await readIndex() }] };
    }
    if (uri === "betterfans://docs/full") {
      return { contents: [{ uri, mimeType: "text/plain", text: await readFull() }] };
    }
    const raw = uri.replace(/^betterfans:\/\/docs\/page\//, "bfl://docs/");
    const slug = raw.startsWith("bfl://docs/") ? normalizeSlug(raw) : undefined;
    const doc = slug ? await readDoc(slug) : undefined;
    if (!doc) throw new Error(`No docs page at ${uri}. List the resources, or use search_docs.`);
    return { contents: [{ uri, mimeType: "text/markdown", text: doc.markdown }] };
  });

  await server.connect(new StdioServerTransport());
  console.error(
    remote
      ? `[betterfans-mcp] ${VERSION} connected to ${MCP_URL}; docs from ${SITE_URL}.`
      : `[betterfans-mcp] ${VERSION} serving docs from ${SITE_URL}. Set BFL_KEY to add the account tools.`,
  );
}

main().catch((err) => {
  console.error("[betterfans-mcp] Fatal:", err);
  process.exit(1);
});
