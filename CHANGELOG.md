# Changelog

## 2.0.0

The BetterFans Link SDK this package documented is retired. BetterFans Link is now a REST API and a hosted MCP server at `https://mcp.betterfans.link/mcp`, for OnlyFans and Fansly, with its own accounts at betterfans.link. No OFManager account is needed.

- New: set `BFL_KEY` to a `bfl_test_` or `bfl_live_` key and the server passes through every tool and prompt of the hosted server, for clients that only run stdio servers.
- New: `get_doc` reads one docs page as markdown, and `get_agent_setup` returns the agent setup steps.
- Changed: `search_docs` searches the current docs and returns the same shape as the hosted server's `search_docs`.
- Changed: resources are `bfl://llms.txt` and `bfl://docs/{slug}`. The 1.x URIs still read.
- Removed: `get_full_docs` (it put the whole docs, about 480 KB, into the context) and `get_quickstart`. Use `search_docs` and `get_doc`, or read `betterfans://docs/full` as a resource.
- Dropped the `zod` dependency. Node 18 or later.

## 1.0.0

Docs for the BetterFans Link SDK.
