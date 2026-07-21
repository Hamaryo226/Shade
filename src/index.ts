import { Hono } from "hono";
import type { Env } from "./types";
import { verifyDiscordRequest } from "./verify";
import { dispatchApplicationCommand } from "./interactions/slashCommand";
import { dispatchMessageComponent } from "./interactions/buttonClick";
import type { ApplicationCommandInteraction, MessageComponentInteraction } from "./discord/interactionTypes";

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2, MESSAGE_COMPONENT: 3 } as const;

const app = new Hono<{ Bindings: Env }>();

app.post("/interactions", async (c) => {
  const { valid, body } = await verifyDiscordRequest(c.req.raw, c.env.DISCORD_PUBLIC_KEY);
  if (!valid) {
    return c.text("Bad request signature.", 401);
  }

  const interaction = JSON.parse(body);

  if (interaction.type === InteractionType.PING) {
    return c.json({ type: 1 });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const response = await dispatchApplicationCommand(c.env, interaction as ApplicationCommandInteraction);
    return c.json(response);
  }

  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    const { response, background } = dispatchMessageComponent(c.env, interaction as MessageComponentInteraction);
    c.executionCtx.waitUntil(background);
    return c.json(response);
  }

  return c.text("Unhandled interaction type.", 400);
});

app.get("/", (c) => c.text("Shade Discord bot is running."));

export default app;
