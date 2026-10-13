# @betterfans/mcp-server

The [BetterFans Link](https://betterfans.link) MCP server for clients that run tools over stdio.

BetterFans Link is an OnlyFans API and a Fansly API for agencies and developers, for the creator accounts they manage. AI clients can read chats, fans, spend and revenue, and can ask for writes such as sending a message. Writes wait for a person on your team to approve them, unless the API key has auto-approve on.

**Most clients should connect to the hosted server directly.** It needs no install and supports OAuth sign-in:

```text
https://mcp.betterfans.link/mcp
```

Setup for Claude Code, Claude, ChatGPT, Cursor, VS Code, Windsurf, Codex and Gemini CLI: [betterfans.link/docs/mcp/clients](https://betterfans.link/docs/mcp/clients).

This package is for clients that can only start a local command, and for coding agents that just need the docs.

| | Tools |
| --- | --- |
| No key | `search_docs`, `get_doc`, `get_agent_setup`, and every docs page as a `bfl://docs/` resource |
| `BFL_KEY` set | Every tool and prompt of the hosted server: `list_accounts`, `list_chats`, `get_chat`, `find_fans`, `revenue_summary`, `send_message` and the rest, passed through over HTTPS |

## Setup

### Docs only (no key)

```json
{
  "mcpServers": {
    "betterfans-link": {
      "command": "npx",
      "args": ["-y", "@betterfans/mcp-server"]
    }
  }
}
```

### With your accounts

1. Create a workspace at [betterfans.link/sign-up](https://betterfans.link/sign-up). It starts in test mode with sandbox creators on OnlyFans and Fansly, so nothing reaches a real fan.
2. Under Developers, create a test key. It starts with `bfl_test_`.
3. Pass it to the server as `BFL_KEY`:

```json
{
  "mcpServers": {
    "betterfans-link": {
      "command": "npx",
      "args": ["-y", "@betterfans/mcp-server"],
      "env": { "BFL_KEY": "bfl_test_..." }
    }
  }
}
```

Keep the key out of files you commit. Most clients can read it from your environment instead, for example `"BFL_KEY": "${env:BFL_KEY}"` in Cursor. The key's scopes and account allow-list apply, exactly as on the REST API. Dashboard keys (`bfl_dash_`) are refused. Switch to a `bfl_live_` key once a creator has linked a real account.

If the key is refused or the hosted server can't be reached, the server still starts with the docs tools and says why on stderr and in its instructions.

## Environment

| Variable | Default | |
| --- | --- | --- |
| `BFL_KEY` | none | A `bfl_test_` or `bfl_live_` API key. Turns on the hosted tools. |
| `BFL_MCP_URL` | `https://mcp.betterfans.link/mcp` | The hosted server. |
| `BFL_SITE_URL` | `https://betterfans.link` | Where the docs are read from. |

## Docs tools

- `search_docs`: find docs pages by topic. Returns slugs, titles, descriptions and links.
- `get_doc`: read one page as markdown, by slug (`webhooks/verify`), docs URL or `bfl://docs/` URI.
- `get_agent_setup`: the setup steps written for an agent.

With a key, `search_docs` and `get_doc` come from the hosted server, which answers the same inputs.

Resources: `bfl://llms.txt` (the docs outline) and `bfl://docs/{slug}` for every page. The 1.x URIs `betterfans://docs/index`, `betterfans://docs/full` and `betterfans://docs/page/{path}` still read.

## Links

- [MCP docs](https://betterfans.link/docs/mcp) and [tools](https://betterfans.link/docs/mcp/tools)
- [API quickstart](https://betterfans.link/docs/get-started/quickstart-api)
- [Agent setup, as markdown](https://betterfans.link/agent-setup)
- Support: [hello@betterfans.link](mailto:hello@betterfans.link)

OnlyFans is a registered trademark of Fenix International Limited. Fansly is a trademark of its owner. BetterFans Link is not affiliated with, sponsored by, or endorsed by either.

## License

MIT
