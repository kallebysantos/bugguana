import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Client } from "npm:discord.js";
import { getDatabase } from "@shared/supabase/service.ts";
import { DiscordWebhookType, parseDiscordRequest } from "./discord_hook.ts";

const DISCORD_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const DISCORD_CHANNEL_ID = Deno.env.get("DISCORD_CHANNEL_ID")!;
const DISCORD_BOT_DEBUG = Deno.env.get("DISCORD_BOT_DEBUG");

const db = getDatabase({ serviceRole: true });
if (typeof db === "string") throw new Error(db);

const client = new Client({
  intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
});

client.once("ready", (val) => {
  if (DISCORD_BOT_DEBUG) {
    console.debug("ready", val);
  }

  console.info("connected");
});

client.on("threadCreate", async (thread) => {
  if (DISCORD_BOT_DEBUG) {
    console.debug("threadCreate", thread);
  }

  if (thread.parentId !== DISCORD_CHANNEL_ID) return;

  // The created Post body is always the first message
  const postMessage = (await thread.messages.fetch({ limit: 1 })).first();
  if (!postMessage) return;

  const { error: createIssueError } = await db.from("issues")
    .insert({
      title: thread.name,
      content: postMessage.content,
    });

  if (createIssueError) {
    console.error(createIssueError, `thread id: ${thread.id}`);
  }
});

client.login(DISCORD_TOKEN);

Deno.serve(async (req) => {
  const { error, payload } = await parseDiscordRequest(req);

  if (error) {
    console.error(
      error,
      "you can ignore it if you're only manual PING the worker",
    );
    return Response.json({ error }, { status: 401 });
  }

  if (payload.type === DiscordWebhookType.PING) {
    return Response.json({ type: 1 });
  }

  return new Response(null, { status: 204 });
});
