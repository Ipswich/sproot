import { createHmac } from "crypto";

export function generateInterserviceAuthenticationToken(key: string, now: Date = new Date()) {
  const utcRoundedHourIso = getUtcRoundedHourIso(now);
  const hmac = createHmac("sha256", key);
  hmac.update(utcRoundedHourIso);
  return hmac.digest("hex");
}

function getUtcRoundedHourIso(now: Date = new Date()): string {
  const newNow = new Date(now.getTime());

  if (newNow.getUTCMinutes() >= 30) {
    newNow.setUTCHours(newNow.getUTCHours() + 1);
  }
  newNow.setUTCMinutes(0, 0, 0);

  return newNow.toISOString().replace(/\.\d{3}Z$/, ".000Z");
}
