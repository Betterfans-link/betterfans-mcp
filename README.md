# @betterfans/mcp-server

MCP (Model Context Protocol) server for the **BetterFans Link SDK** — the only developer API for the OnlyFans platform.

Gives AI coding assistants like **Claude Code**, **Cursor**, and **Windsurf** direct access to OnlyFans API documentation, code examples, and guides so they can help you build OnlyFans agency tools, chatbots, CRMs, and automations.

## Setup

### Claude Code

Add to your Claude Code MCP config (`~/.claude/claude_desktop_config.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "betterfans": {
      "command": "npx",
      "args": ["-y", "@betterfans/mcp-server"]
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "betterfans": {
      "command": "npx",
      "args": ["-y", "@betterfans/mcp-server"]
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP config:

```json
{
  "mcpServers": {
    "betterfans": {
      "command": "npx",
      "args": ["-y", "@betterfans/mcp-server"]
    }
  }
}
```

## What it provides

### Tools

| Tool | Description |
|------|-------------|
| `search_docs` | Search the OnlyFans API documentation by keyword |
| `get_full_docs` | Get the complete SDK documentation with all code examples |
| `get_quickstart` | Get the quickstart guide for setting up the SDK |

### Resources

| Resource | Description |
|----------|-------------|
| `betterfans://docs/index` | Documentation index with all available pages |
| `betterfans://docs/full` | Complete documentation dump |
| `betterfans://docs/page/{path}` | Individual documentation pages |

## What is BetterFans Link SDK?

The BetterFans Link SDK (`@betterfans/link-sdk`) is a fully typed TypeScript SDK that provides complete access to the OnlyFans platform — chats, messages, posts, subscriptions, media uploads, earnings, and real-time WebSocket events.

It's the infrastructure behind [OFManager](https://ofmanager.com), the leading OnlyFans agency management platform.

**An OFManager account is required** to use the SDK. Sign up at [platform.ofmanager.com](https://platform.ofmanager.com).

## Links

- [Documentation](https://betterfans.link)
- [OFManager](https://ofmanager.com)
- [Telegram](https://t.me/ofmanagercom)
