export function readableTextColor(bg: string): string {
  const s = String(bg || "").trim();
  const hexMatch = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hexRaw = hexMatch[1];
    if (!hexRaw) return "#000";
    let hex = hexRaw;
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 160 ? "#000" : "#fff";
  }
  return "#000";
}

export default readableTextColor;
