import { verifyKey } from "discord-interactions";

export async function verifyDiscordRequest(
  request: Request,
  publicKey: string,
): Promise<{ valid: boolean; body: string }> {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  const body = await request.text();

  if (!signature || !timestamp) {
    return { valid: false, body };
  }

  const valid = await verifyKey(body, signature, timestamp, publicKey);
  return { valid, body };
}
