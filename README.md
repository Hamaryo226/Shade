# Shade

A Discord bot that manages server roles through emoji-labeled buttons, running entirely on Cloudflare Workers.

An admin posts a "role menu" message and binds roles to it with `/rolemenu` slash commands. Each binding shows up as
a button with an emoji and the role's name. Clicking a button grants the role; clicking it again removes it.

## Why buttons instead of emoji reactions?

Cloudflare Workers is a stateless, HTTP-request-driven runtime. Discord's reaction add/remove events are only
delivered over the Gateway (a persistent WebSocket connection), which Workers can't maintain on its own. Message
Component (button) clicks, on the other hand, are delivered as ordinary HTTP Interaction requests — the same
mechanism slash commands use — so the whole bot fits Workers' request/response model with no persistent connection,
Durable Object, or extra hosting needed.

## Architecture

- **Runtime**: Cloudflare Workers (TypeScript), routed with [Hono](https://hono.dev/).
- **Discord transport**: a single `POST /interactions` endpoint, verified with `discord-interactions`' Ed25519
  signature check, handling both slash commands and button clicks.
- **Persistence**: Cloudflare KV (namespace `ROLE_MENUS`) stores each menu message's emoji/role bindings as JSON.
- **Role changes**: done via direct Discord REST API calls (`PUT`/`DELETE .../members/{user}/roles/{role}`), not the Gateway.

## 1. Create the Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Under **Bot**, create a bot user and copy the **token** (`DISCORD_TOKEN`).
3. Under **General Information**, copy the **Public Key** (`DISCORD_PUBLIC_KEY`) and **Application ID**
   (`DISCORD_APPLICATION_ID`).
4. You do **not** need to enable any privileged Gateway intents — this bot never connects to the Gateway.

## 2. Invite the bot to your server

Build an OAuth2 URL with:
- Scopes: `bot`, `applications.commands`
- Bot permissions: `Manage Roles`, `Send Messages`, `Embed Links`, `View Channel`

```
https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&scope=bot%20applications.commands&permissions=268454912
```

**Role hierarchy matters**: after inviting the bot, go to Server Settings → Roles and drag the bot's own role
**above** any role you want it to grant or remove. Discord rejects role changes for roles at or above the bot's
own highest role — `/rolemenu add` checks this up front and will tell you if it's misconfigured.

## 3. Local setup

> For a detailed, step-by-step Cloudflare-side setup guide (account creation, `wrangler`
> login, KV namespace, secrets, deployment, custom domains, troubleshooting — in Japanese),
> see [docs/cloudflare-setup.md](docs/cloudflare-setup.md).

```bash
npm install
cp .dev.vars.example .dev.vars
# fill in DISCORD_TOKEN, DISCORD_PUBLIC_KEY, DISCORD_APPLICATION_ID (and optionally DEV_GUILD_ID) in .dev.vars
```

Create the KV namespace and paste the returned ID into `wrangler.toml`:

```bash
npx wrangler kv namespace create ROLE_MENUS
```

## 4. Register slash commands

```bash
npm run register-commands
```

Set `DEV_GUILD_ID` in `.dev.vars` to register commands to a single guild for instant propagation while developing.
Without it, commands register globally, which can take up to an hour to show up everywhere.

## 5. Deploy

```bash
npm run deploy
```

Set the same secrets on the deployed Worker (these are not read from `.dev.vars` in production):

```bash
npx wrangler secret put DISCORD_TOKEN
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_APPLICATION_ID
```

Then, in the Developer Portal, set **Interactions Endpoint URL** to your deployed Worker's URL plus `/interactions`
(e.g. `https://shade-discord-bot.<your-subdomain>.workers.dev/interactions`). Discord will send a verification
ping immediately — the endpoint must already be deployed and reachable for this to succeed.

## Usage

- `/rolemenu create title:<title> description:<description> [channel]` — posts a new role menu message.
- `/rolemenu add message_id:<id> emoji:<emoji> role:<role>` — adds a button for `role` to the menu, labeled with
  `emoji` (accepts a plain unicode emoji or Discord's `<:name:id>` / `<a:name:id>` custom emoji format).
- `/rolemenu remove message_id:<id> role:<role>` — removes that role's button from the menu.
- `/rolemenu delete message_id:<id>` — un-registers the whole menu (the Discord message itself is left alone).
- `/rolemenu list [message_id]` — shows current bindings for one menu, or a summary of all registered menus.

All `/rolemenu` subcommands require the **Manage Roles** permission.

## Known limitations

- This is button-based, not literal emoji-reaction-based, due to the Gateway/Workers incompatibility described above.
- Cloudflare KV is eventually consistent (writes can take up to ~60s to propagate globally); a binding added and
  clicked from a different region within that window may not be visible yet.
- Discord allows at most 25 buttons (5 rows × 5) on a single message, so a menu can bind at most 25 roles.

## Development

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest (unit tests for pure logic: role hierarchy checks, custom_id/emoji parsing)
npm run dev          # local Worker dev server (wrangler dev)
```

Signature verification and the full Discord interaction flow require a real Discord app and can't be exercised in
unit tests — verify those manually against a real server after deploying (see Usage above).
