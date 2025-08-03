import { createHmac } from "crypto";

export function generateInterserviceAuthenticationToken(key: string, now: Date = new Date()) {
  const utcRoundedHourIso = getUtcRoundedHourIso(now);
  const hmac = createHmac("sha256", key);
  hmac.update(utcRoundedHourIso);
  return hmac.digest("hex");
}

function getUtcRoundedHourIso(now: Date = new Date()): string {
  const newNow = new Date(now.getTime());
  newNow.setUTCMinutes(0, 0, 0);

  return newNow.toISOString().replace(/\.\d{3}Z$/, ".000Z");
}
