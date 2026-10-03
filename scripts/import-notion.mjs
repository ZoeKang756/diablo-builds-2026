// 把 Notion「匯出 → HTML」的資料轉成 src/data/pages.js，並把截圖複製到 public/images/
//
// 用法：
//   1. 解壓縮 Notion 匯出的 zip
//   2. npm run import-notion -- <解壓縮後的資料夾>
//
// 頁面網址（slug）與截圖說明寫在 scripts/notion-overrides.json，以 Notion 頁面 ID 對應。
// 沒設定 slug 的新頁面會自動使用 page-<ID 前 8 碼>。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DATA = path.join(ROOT, "src/data/pages.js");
const OUT_IMAGES = path.join(ROOT, "public/images");
const OVERRIDES = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/notion-overrides.json"), "utf8"));

// 職業篩選的顯示順序；不在清單裡的新職業會排在最後
const KNOWN_CLASSES = ["血騎士", "術士", "秘術師", "德魯伊", "聖教軍", "風暴使者", "野蠻人", "狩魔獵人", "死靈法師", "武僧"];
const KNOWN_CATEGORIES = ["配裝截圖", "其他資訊"];
const HEADING_MAX = 20; // 超過這個字數的 Notion 標題當成文字筆記

const input = process.argv[2];
if (!input) {
  console.error("請指定 Notion 匯出解壓縮後的資料夾，例如：npm run import-notion -- ~/Downloads/Export");
  process.exit(1);
}

/* ---------- 小工具 ---------- */
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]
  );
const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");
const stripTags = (s) => decode(s.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "")).trim();
const notionId = (file) => (path.basename(file).match(/([0-9a-f]{32})\.html$/) || [])[1];
const youtubeId = (url) =>
  (url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/) || [])[1];

/* ---------- 找資料庫頁面，依檢視順序取得子頁面 ---------- */
const htmlFiles = walk(path.resolve(input)).filter((f) => f.endsWith(".html"));
const dbFile = htmlFiles.find((f) => fs.readFileSync(f, "utf8").includes('class="collection-content"'));
if (!dbFile) {
  console.error("找不到資料庫頁面（collection-content）。請確認匯出的是整個資料庫。");
  process.exit(1);
}
const dbHtml = fs.readFileSync(dbFile, "utf8");
const pageFiles = [];
for (const m of dbHtml.matchAll(/href="([^"]+\.html)"/g)) {
  const file = path.resolve(path.dirname(dbFile), decodeURIComponent(m[1]));
  if (fs.existsSync(file) && !pageFiles.includes(file)) pageFiles.push(file);
}

/* ---------- 解析單一頁面 ---------- */
function parsePage(file) {
  const html = fs.readFileSync(file, "utf8");
  const id = notionId(file);
  const title = stripTags((html.match(/<h1 class="page-title"[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "");

  const props = {};
  const table = (html.match(/<table class="properties">([\s\S]*?)<\/table>/) || [])[1] || "";
  for (const row of table.matchAll(/<tr[^>]*>\s*<th>([\s\S]*?)<\/th>\s*<td>([\s\S]*?)<\/td>/g)) {
    const key = stripTags(row[1]);
    const date = row[2].match(/datetime="([\d-]+)"/);
    props[key] = date ? date[1] : stripTags(row[2]) || null;
  }

  const body = (html.match(/<div class="page-body">([\s\S]*)<\/div><\/article>/) || [])[1] || "";
  const tokens =
    /<figure[^>]*class="image"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<\/figure>|<figure[^>]*>\s*<div class="source"><a href="([^"]+)"[\s\S]*?<\/figure>|<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>|<p[^>]*>([\s\S]*?)<\/p>/g;

  const blocks = [];
  for (const m of body.matchAll(tokens)) {
    const [, img, link, heading, para] = m;
    if (img) {
      const src = path.resolve(path.dirname(file), decodeURIComponent(img));
      const last = blocks.at(-1);
      if (last?.type === "gallery") last.files.push(src);
      else blocks.push({ type: "gallery", files: [src] });
    } else if (link) {
      const url = decode(link);
      const yt = youtubeId(url);
      blocks.push(yt ? { type: "video", youtubeId: yt } : { type: "link", url });
    } else if (heading !== undefined) {
      const text = stripTags(heading);
      if (text) blocks.push({ type: text.length > HEADING_MAX ? "text" : "heading", text });
    } else if (para !== undefined) {
      const text = stripTags(para);
      const yt = youtubeId(text);
      if (yt && /^https?:\/\/\S+$/.test(text)) blocks.push({ type: "video", youtubeId: yt });
      // 略過只有標點符號的殘留段落（例如單獨的「/」）
      else if (/[\p{L}\p{N}]/u.test(text)) blocks.push({ type: "text", text });
    }
  }

  return {
    id,
    title,
    class: props["職業"] || null,
    category: props["分類"] || null,
    date: props["整理日期"] || null,
    tier: props["當前地圖等級"] || null,
    blocks,
  };
}

/* ---------- 輸出 ---------- */
fs.rmSync(OUT_IMAGES, { recursive: true, force: true });
fs.mkdirSync(OUT_IMAGES, { recursive: true });

const usedSlugs = new Set();
let imageCount = 0;
const missing = [];

const pages = pageFiles.map(parsePage).map((p) => {
  const override = OVERRIDES[p.id] || {};
  let slug = override.slug || `page-${p.id.slice(0, 8)}`;
  while (usedSlugs.has(slug)) slug += "-2";
  usedSlugs.add(slug);

  let n = 0;
  const captions = override.captions || [];
  const blocks = p.blocks.map((b) => {
    if (b.type !== "gallery") return b;
    const images = [];
    for (const src of b.files) {
      if (!fs.existsSync(src)) {
        missing.push(src);
        continue;
      }
      n += 1;
      const name = `${String(n).padStart(2, "0")}${path.extname(src).toLowerCase()}`;
      fs.mkdirSync(path.join(OUT_IMAGES, slug), { recursive: true });
      fs.copyFileSync(src, path.join(OUT_IMAGES, slug, name));
      const caption = captions[n - 1];
      images.push({ src: `/images/${slug}/${name}`, ...(caption ? { caption } : {}) });
    }
    return { type: "gallery", images };
  }).filter((b) => b.type !== "gallery" || b.images.length);
  imageCount += n;

  const { id, ...rest } = p;
  return { slug, notionId: id, ...rest, blocks };
});

const order = (known, found) => [...known.filter((k) => found.includes(k)), ...found.filter((f) => !known.includes(f))];
const classes = order(KNOWN_CLASSES, [...new Set(pages.map((p) => p.class).filter(Boolean))]);
const categories = order(KNOWN_CATEGORIES, [...new Set(pages.map((p) => p.category).filter(Boolean))]);

const js = `// 此檔案由 scripts/import-notion.mjs 自動產生，請勿手動修改。
// 資料來源：Notion「${stripTags((dbHtml.match(/<h1 class="page-title"[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "")}」
// 產生時間：${new Date().toISOString()}
//
// blocks 類型：gallery（截圖）、video（YouTube）、heading（小標題）、text（文字）、link（一般連結）

export const CLASSES = ${JSON.stringify(classes)};
export const CATEGORIES = ${JSON.stringify(categories)};

export const PAGES = ${JSON.stringify(pages, null, 2)};

export const getPage = (slug) => PAGES.find((p) => p.slug === slug);
`;
fs.writeFileSync(OUT_DATA, js);

console.log(`完成：${pages.length} 個頁面、${imageCount} 張截圖`);
pages.filter((p) => p.slug.startsWith("page-")).forEach((p) =>
  console.log(`  新頁面「${p.title || "無標題"}」使用預設網址 /#/pages/${p.slug}，可在 notion-overrides.json 設定 slug（ID：${p.notionId}）`)
);
if (missing.length) console.warn(`找不到 ${missing.length} 張圖片：\n  ${missing.join("\n  ")}`);
