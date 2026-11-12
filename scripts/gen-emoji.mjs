// 从 public/assets/szmEmoji 生成 src/lib/emoji-data.ts（表情包清单 + token→图片映射）。
// 用法：npm run emoji:gen      （新增/删除表情图片后重新跑一次）
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const EMOJI_DIR = join(ROOT, "public", "assets", "szmEmoji");
const OUT_FILE = join(ROOT, "src", "lib", "emoji-data.ts");

function readPack(id) {
  const dir = join(EMOJI_DIR, id);
  let name = id;
  try {
    const idx = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
    if (idx && typeof idx.name === "string" && idx.name.trim()) name = idx.name.trim();
  } catch {
    /* 没有 index.json 就用目录名 */
  }
  const files = readdirSync(dir)
    .filter((f) => /\.(png|gif)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  return { id, name, files };
}

const packIds = readdirSync(EMOJI_DIR)
  .filter((d) => statSync(join(EMOJI_DIR, d)).isDirectory())
  .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));

const packs = packIds.map(readPack);

// 统计名字，重名的加 pack 前缀，避免 token 冲突
const counts = new Map();
for (const pack of packs) {
  for (const file of pack.files) {
    const base = file.replace(/\.[^.]+$/, "");
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }
}

const emojiMap = {};
const packOut = packs.map((pack) => ({
  id: pack.id,
  name: pack.name,
  emojis: pack.files.map((file) => {
    const name = file.replace(/\.[^.]+$/, "");
    const token = (counts.get(name) ?? 0) > 1 ? `${pack.id}-${name}` : name;
    const url = `/assets/szmEmoji/${pack.id}/${encodeURIComponent(file)}`;
    emojiMap[token] = url;
    return { name, token, url };
  }),
}));

const header = `// 由 scripts/gen-emoji.mjs 自动生成，请勿手改。
// 重新生成：npm run emoji:gen

export interface EmojiItem {
  name: string;
  /** markdown 里使用的 \`:token:\` */
  token: string;
  url: string;
}

export interface EmojiPack {
  id: string;
  name: string;
  emojis: EmojiItem[];
}

/** 表情包列表（按目录序号排序） */
export const EMOJI_PACKS: EmojiPack[] = ${JSON.stringify(packOut, null, 2)};

/** token → 图片地址 */
export const EMOJI_MAP: Record<string, string> = ${JSON.stringify(emojiMap, null, 2)};
`;

writeFileSync(OUT_FILE, header, "utf8");
const total = packOut.reduce((n, p) => n + p.emojis.length, 0);
console.log(`emoji-data.ts 已生成：${packOut.length} 个表情包，${total} 个表情`);
