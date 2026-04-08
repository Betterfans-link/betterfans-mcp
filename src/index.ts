#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = "https://betterfans.link";

const server = new McpServer({
  name: "BetterFans",
  version: "1.0.0",
});

// --- Resources ---

server.resource(
  "docs-index",
  "betterfans://docs/index",
  {
    description:
      "BetterFans Link SDK documentation index — the OnlyFans API. " +
      "Lists all available documentation pages with descriptions.",
  },
  async () => {
    const res = await fetch(`${BASE_URL}/llms.txt`);
    return { contents: [{ uri: "betterfans://docs/index", text: await res.text(), mimeType: "text/plain" }] };
  },
);

server.resource(
  "docs-full",
  "betterfans://docs/full",
  {
    description:
      "Complete BetterFans Link SDK documentation — the OnlyFans API. " +
      "Full reference including all code examples, API methods, types, " +
      "guides for building OnlyFans chatbots, CRMs, and automations.",
  },
  async () => {
    const res = await fetch(`${BASE_URL}/llms-full.txt`);
    return { contents: [{ uri: "betterfans://docs/full", text: await res.text(), mimeType: "text/plain" }] };
  },
);

server.resource(
  "docs-page",
  new ResourceTemplate("betterfans://docs/page/{+path}", { list: undefined }),
  {
    description:
      "A specific documentation page from the BetterFans Link SDK docs. " +
      "Use paths like: getting-started/quickstart, api-reference/chats, " +
      "plugins/media, websocket/events, etc.",
  },
  async (uri, { path }) => {
    const pagePath = Array.isArray(path) ? path.join("/") : path;
    const res = await fetch(`${BASE_URL}/docs/${pagePath}`);
    if (!res.ok) {
      return { contents: [{ uri: uri.href, text: `Page not found: ${pagePath}`, mimeType: "text/plain" }] };
    }
    const html = await res.text();
    // Strip HTML tags for a rough plaintext extraction
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return { contents: [{ uri: uri.href, text, mimeType: "text/plain" }] };
  },
);

// --- Tools ---

server.tool(
  "search_docs",
  "Search the BetterFans Link SDK documentation (OnlyFans API). " +
    "Use this to find information about OnlyFans API endpoints, " +
    "chats, messages, posts, subscriptions, media uploads, earnings, " +
    "websocket events, chatbot tutorials, and more.",
  { query: z.string().describe("Search query") },
  async ({ query }) => {
    const res = await fetch(`${BASE_URL}/api/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) {
      return { content: [{ type: "text" as const, text: `Search failed: ${res.status}` }] };
    }
    const results = await res.json() as Array<{ id: string; url: string; content: string; }>;

    if (!Array.isArray(results) || results.length === 0) {
      return { content: [{ type: "text" as const, text: `No results found for "${query}". Try broader terms like "chats", "messages", "media", or "websocket".` }] };
    }

    const formatted = results
      .slice(0, 10)
      .map((r) => `## ${r.url}\n${r.content}`)
      .join("\n\n---\n\n");

    return {
      content: [{ type: "text" as const, text: formatted }],
    };
  },
);

server.tool(
  "get_full_docs",
  "Get the complete BetterFans Link SDK documentation (OnlyFans API). " +
    "Returns all docs including API reference, code examples, guides, " +
    "and tutorials for building OnlyFans agency tools, chatbots, CRMs, " +
    "and automations. Use this when you need comprehensive reference.",
  {},
  async () => {
    const res = await fetch(`${BASE_URL}/llms-full.txt`);
    return {
      content: [{ type: "text" as const, text: await res.text() }],
    };
  },
);

server.tool(
  "get_quickstart",
  "Get the BetterFans Link SDK quickstart guide. " +
    "Shows how to install the SDK, set up credentials via OFManager, " +
    "and make your first OnlyFans API calls.",
  {},
  async () => {
    const res = await fetch(`${BASE_URL}/llms.txt`);
    return {
      content: [{ type: "text" as const, text: await res.text() }],
    };
  },
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
