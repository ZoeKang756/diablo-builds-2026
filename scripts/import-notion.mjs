// 把 Notion「匯出 → HTML」的資料轉成 src/data/pages.js，並把截圖複製到 public/images/
//
// 用法（先解壓縮 Notion 匯出的 zip）：
//   完整匯入：npm run import-notion -- <資料夾>
//     匯出整個資料庫時使用。依 Notion 列表順序重建所有頁面，舊資料與舊截圖會全部替換。
//
//   單頁匯入：npm run import-notion -- <資料夾> --page
//     只匯出一個或幾個頁面時使用。已存在的頁面會原地更新（位置與網址不變），
//     新頁面加在列表最後，其他頁面和截圖都不會動。
//     資料夾裡沒有資料庫頁面時，會自動使用單頁匯入。
//
// 頁面網址（slug）與截圖說明寫在 scripts/notion-overrides.json，以 Notion 頁面 ID 對應。
// 沒設定 slug 的新頁面會自動使用 page-<ID 前 8 碼>。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DATA = path.join(ROOT, "src/data/pages.js");
const OUT_IMAGES = path.join(ROOT, "public/images");
const OVERRIDES = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/notion-overrides.json"), "utf8"));

// 職業篩選的顯示順序；不在清單裡的新職業會排在最後
const KNOWN_CLASSES = ["血騎士", "術士", "秘術師", "德魯伊", "聖教軍", "風暴使者", "野蠻人", "狩魔獵人", "死靈法師", "武僧"];
const KNOWN_CATEGORIES = ["配裝截圖", "其他資訊"];
const HEADING_MAX = 20; // 超過這個字數的 Notion 標題當成文字筆記

const args = process.argv.slice(2);
const forcePage = args.includes("--page");
const input = args.find((a) => !a.startsWith("--"));
if (!input) {
  console.error("請指定 Notion 匯出解壓縮後的資料夾，例如：");
  console.error("  完整匯入：npm run import-notion -- ~/Downloads/Export");
  console.error("  單頁匯入：npm run import-notion -- ~/Downloads/Export --page");
  process.exit(1);
}
if (!fs.existsSync(input)) {
  console.error(`找不到資料夾：${input}`);
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

/* ---------- 決定匯入模式與要處理的頁面 ---------- */
const htmlFiles = walk(path.resolve(input)).filter((f) => f.endsWith(".html"));
const isDb = (f) => fs.readFileSync(f, "utf8").includes('class="collection-content"');
const dbFile = htmlFiles.find(isDb);
const mode = forcePage || !dbFile ? "page" : "full";

let pageFiles = [];
if (mode === "full") {
  // 依資料庫的檢視順序取得子頁面
  const dbHtml = fs.readFileSync(dbFile, "utf8");
  for (const m of dbHtml.matchAll(/href="([^"]+\.html)"/g)) {
    const file = path.resolve(path.dirname(dbFile), decodeURIComponent(m[1]));
    if (fs.existsSync(file) && !pageFiles.includes(file)) pageFiles.push(file);
  }
} else {
  // 單頁匯入：資料夾裡所有一般頁面（略過資料庫頁面本身）
  pageFiles = htmlFiles.filter((f) => notionId(f) && !isDb(f)).sort();
}
if (!pageFiles.length) {
  console.error("資料夾裡找不到 Notion 頁面（.html）。請確認匯出格式選的是 HTML。");
  process.exit(1);
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

/* ---------- 讀取現有資料（單頁匯入用） ---------- */
let existing = [];
if (mode === "page") {
  if (!fs.existsSync(OUT_DATA)) {
    console.error("還沒有 src/data/pages.js，第一次請先用完整匯入。");
    process.exit(1);
  }
  existing = (await import(pathToFileURL(OUT_DATA).href + `?t=${Date.now()}`)).PAGES;
}

/* ---------- 列表縮圖（需要 sharp；沒有安裝時列表直接用第一張原圖） ---------- */
let sharp = null;
try {
  sharp = (await import("sharp")).default;
} catch {
  /* sharp 是選用套件 */
}
const THUMB_WIDTH = 720;
const thumbJobs = [];

/* ---------- 轉換頁面、複製截圖 ---------- */
let imageCount = 0;
const missing = [];

if (mode === "full") {
  fs.rmSync(OUT_IMAGES, { recursive: true, force: true });
}
fs.mkdirSync(OUT_IMAGES, { recursive: true });

function buildPage(p, slug) {
  const override = OVERRIDES[p.id] || {};
  const captions = override.captions || [];
  const dir = path.join(OUT_IMAGES, slug);
  fs.rmSync(dir, { recursive: true, force: true }); // 只清掉這一頁自己的截圖
  let n = 0;
  const blocks = p.blocks
    .map((b) => {
      if (b.type !== "gallery") return b;
      const images = [];
      for (const src of b.files) {
        if (!fs.existsSync(src)) {
          missing.push(src);
          continue;
        }
        n += 1;
        const name = `${String(n).padStart(2, "0")}${path.extname(src).toLowerCase()}`;
        fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(src, path.join(dir, name));
        const caption = captions[n - 1];
        images.push({ src: `/images/${slug}/${name}`, ...(caption ? { caption } : {}) });
      }
      return { type: "gallery", images };
    })
    .filter((b) => b.type !== "gallery" || b.images.length);
  imageCount += n;
  const { id, ...rest } = p;
  const page = { slug, notionId: id, ...rest, blocks };
  const first = blocks.find((b) => b.type === "gallery")?.images[0];
  if (first && sharp) {
    thumbJobs.push({ page, from: path.join(ROOT, "public", first.src), to: path.join(dir, "thumb.webp") });
  }
  return page;
}

const pickSlug = (p, used) => {
  let slug = (OVERRIDES[p.id] || {}).slug || `page-${p.id.slice(0, 8)}`;
  while (used.has(slug)) slug += "-2";
  used.add(slug);
  return slug;
};

// 單頁匯入時略過完全空白的頁面（沒有標題、屬性和內容，通常是 Notion 殘留的草稿）
const parsed = pageFiles.map(parsePage).filter((p) => {
  const empty = !p.title && !p.class && !p.category && !p.blocks.length;
  if (empty && mode === "page") console.log(`  略過空白頁面（ID：${p.id}）`);
  return !(empty && mode === "page");
});
const report = { updated: [], added: [] };
let pages;

if (mode === "full") {
  const used = new Set();
  pages = parsed.map((p) => buildPage(p, pickSlug(p, used)));
} else {
  pages = [...existing];
  for (const p of parsed) {
    const idx = pages.findIndex((e) => e.notionId === p.id);
    if (idx >= 0) {
      // 已存在：保留原本的網址與位置
      const slug = (OVERRIDES[p.id] || {}).slug || pages[idx].slug;
      if (slug !== pages[idx].slug) fs.rmSync(path.join(OUT_IMAGES, pages[idx].slug), { recursive: true, force: true });
      pages[idx] = buildPage(p, slug);
      report.updated.push(pages[idx]);
    } else {
      const used = new Set(pages.map((e) => e.slug));
      const page = buildPage(p, pickSlug(p, used));
      pages.push(page);
      report.added.push(page);
    }
  }
}

/* ---------- 產生列表縮圖 ---------- */
let thumbCount = 0;
await Promise.all(
  thumbJobs.map(async ({ page, from, to }) => {
    try {
      await sharp(from).resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 72 }).toFile(to);
      page.thumb = `/images/${page.slug}/thumb.webp`;
      thumbCount += 1;
    } catch (err) {
      console.warn(`  縮圖產生失敗（${page.title || page.slug}）：${err.message}`);
    }
  })
);

/* ---------- 寫出 src/data/pages.js ---------- */
const order = (known, found) => [...known.filter((k) => found.includes(k)), ...found.filter((f) => !known.includes(f))];
const classes = order(KNOWN_CLASSES, [...new Set(pages.map((p) => p.class).filter(Boolean))]);
const categories = order(KNOWN_CATEGORIES, [...new Set(pages.map((p) => p.category).filter(Boolean))]);

const js = `// 此檔案由 scripts/import-notion.mjs 自動產生，請勿手動修改。
// 最後匯入：${new Date().toISOString()}（${mode === "full" ? "完整匯入" : "單頁匯入"}）
//
// blocks 類型：gallery（截圖）、video（YouTube）、heading（小標題）、text（文字）、link（一般連結）
// thumb：列表用的縮圖（第一張截圖縮小成 WebP）

export const CLASSES = ${JSON.stringify(classes)};
export const CATEGORIES = ${JSON.stringify(categories)};

export const PAGES = ${JSON.stringify(pages, null, 2)};

export const getPage = (slug) => PAGES.find((p) => p.slug === slug);
`;
fs.writeFileSync(OUT_DATA, js);

/* ---------- 結果報告 ---------- */
const label = (p) => `「${p.title || "無標題"}」→ /#/pages/${p.slug}`;
if (mode === "full") {
  console.log(`完整匯入完成：${pages.length} 個頁面、${imageCount} 張截圖`);
} else {
  console.log(`單頁匯入完成：更新 ${report.updated.length} 頁、新增 ${report.added.length} 頁，共 ${imageCount} 張截圖`);
  report.updated.forEach((p) => console.log(`  更新 ${label(p)}`));
  report.added.forEach((p) => console.log(`  新增 ${label(p)}（加在列表最後）`));
}
pages
  .filter((p) => p.slug.startsWith("page-") && (mode === "full" || report.added.includes(p)))
  .forEach((p) =>
    console.log(`  提示：「${p.title || "無標題"}」使用預設網址，可在 notion-overrides.json 設定 slug（ID：${p.notionId}）`)
  );
if (sharp) console.log(`  列表縮圖：${thumbCount} 張`);
else console.log("  提示：沒有安裝 sharp，列表會直接使用第一張原圖。執行 npm install 即可安裝。");
if (missing.length) console.warn(`找不到 ${missing.length} 張圖片：\n  ${missing.join("\n  ")}`);
