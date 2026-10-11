/** 每个学生一个固定的柔和色，让名单有颜色但不抢主色。 */
const PALETTE = [
  { bg: "#FFD8E2", fg: "#7A1236" },
  { bg: "#FFE2BE", fg: "#7A4310" },
  { bg: "#D7E6FF", fg: "#123A78" },
  { bg: "#D3F0E1", fg: "#0F5238" },
  { bg: "#E8DBFB", fg: "#4A2280" },
  { bg: "#FFDCD0", fg: "#7A2F14" },
  { bg: "#CDEBF0", fg: "#0F4C57" },
  { bg: "#F1E4C3", fg: "#6B4E12" },
];

export interface AvatarTone {
  bg: string;
  fg: string;
}

export function avatarTone(seed: string): AvatarTone {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return PALETTE[hash % PALETTE.length];
}

/** 中文取姓名末字，英文取首字母。 */
export function avatarInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  if (/^[\x20-\x7E]+$/.test(trimmed)) return trimmed[0].toUpperCase();
  return trimmed.slice(-1);
}
