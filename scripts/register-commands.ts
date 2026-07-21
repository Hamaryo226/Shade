// Registers the /rolemenu slash command with Discord's REST API.
// Run once after deploying (and again whenever commandDefinitions changes):
//   npm run register-commands
//
// Reads DISCORD_TOKEN / DISCORD_APPLICATION_ID / DEV_GUILD_ID from .dev.vars
// (or the real environment, e.g. in CI). Set DEV_GUILD_ID to register commands
// to a single guild for instant propagation during development; omit it to
// register them globally (can take up to an hour to appear everywhere).
import { config } from "dotenv";
import { commandDefinitions } from "../src/commands/definitions";

config({ path: ".dev.vars" });

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DEV_GUILD_ID;

if (!token || !applicationId) {
  console.error("DISCORD_TOKEN and DISCORD_APPLICATION_ID must be set (see .dev.vars.example).");
  process.exit(1);
}

const url = guildId
  ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${applicationId}/commands`;

const response = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commandDefinitions),
});

if (!response.ok) {
  console.error(`Failed to register commands: ${response.status} ${await response.text()}`);
  process.exit(1);
}

console.log(`Registered ${commandDefinitions.length} command(s) ${guildId ? `to guild ${guildId}` : "globally"}.`);
