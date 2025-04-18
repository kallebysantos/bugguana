import nacl from "https://cdn.skypack.dev/tweetnacl";

const PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY")!;
console.log(PUBLIC_KEY);

// Webhook Type Enum
export enum DiscordWebhookType {
  PING = 0,
  EVENT = 1,
}

// Event Body Object
export interface DiscordWebhookEventBody {
  type: string; // Specific event type, e.g., "MESSAGE_CREATE"
  timestamp: string; // ISO 8601 timestamp
  data?: Record<string, any>; // Event-specific payload
}

// Full Webhook Payload
export interface DiscordWebhookPayload {
  version: number; // Always 1
  application_id: string; // Snowflake ID of your app
  type: DiscordWebhookType; // 0 (PING) or 1 (Event)
  event?: DiscordWebhookEventBody; // Present only for EVENT type
}

/** Verify whether the request is coming from Discord. */
export async function parseDiscordRequest(
  request: Request,
): Promise<{ error?: string; payload: DiscordWebhookPayload }> {
  const signature = request.headers.get("X-Signature-Ed25519")!;
  const timestamp = request.headers.get("X-Signature-Timestamp")!;

  const body = await request.text();

  const isValid = (signature && PUBLIC_KEY) &&
    nacl.sign.detached.verify(
      new TextEncoder().encode(timestamp + body),
      hexToUint8Array(signature),
      hexToUint8Array(PUBLIC_KEY),
    );

  return {
    payload: !!body.length && JSON.parse(body),
    error: !isValid ? "Invalid request" : undefined,
  };
}

function hexToUint8Array(hex: string) {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16)));
}
