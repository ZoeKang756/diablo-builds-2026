// 暗黑破壞神：永生不朽 全職業代表色（顏色定義在 index.css 的 --c-* 變數，深淺色模式各一組）
export const CLASS_COLORS = {
  血騎士: "var(--c-blood)",
  野蠻人: "var(--c-barbarian)",
  聖教軍: "var(--c-crusader)",
  死靈法師: "var(--c-necro)",
  德魯伊: "var(--c-druid)",
  狩魔獵人: "var(--c-dh)",
  風暴使者: "var(--c-tempest)",
  秘術師: "var(--c-wizard)",
  術士: "var(--c-warlock)",
  武僧: "var(--c-monk)",
};

// 取得職業顏色；未來遊戲新增、這裡還沒設定的職業，會依名稱自動產生固定的顏色
export function classColor(cls) {
  if (!cls) return "var(--gold)";
  if (CLASS_COLORS[cls]) return CLASS_COLORS[cls];
  let hash = 0;
  for (const ch of cls) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return `hsl(${hash % 360} 55% 55%)`;
}

// 讓 /images/... 在子路徑部署時也能正確載入
export const asset = (path) => import.meta.env.BASE_URL + path.replace(/^\//, "");

export const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
};

export const displayTitle = (page) => page.title || "無標題";

// 依內容產生摘要，例如「1 部影片、3 張截圖」
export function contentSummary(page) {
  let shots = 0;
  let videos = 0;
  for (const b of page.blocks) {
    if (b.type === "gallery") shots += b.images.length;
    if (b.type === "video") videos += 1;
  }
  const parts = [];
  if (videos) parts.push(`${videos} 部影片`);
  if (shots) parts.push(`${shots} 張截圖`);
  if (!parts.length && page.blocks.some((b) => b.type === "text")) parts.push("文字筆記");
  return parts.join("、");
}

// 列表卡片的縮圖：優先用匯入時產生的縮圖，其次是第一張截圖，再來是第一部影片的 YouTube 封面
export function pageThumb(page) {
  if (page.thumb) return { src: asset(page.thumb), kind: "image" };
  for (const b of page.blocks) {
    if (b.type === "gallery" && b.images.length) return { src: asset(b.images[0].src), kind: "image" };
  }
  const video = page.blocks.find((b) => b.type === "video");
  if (video) return { src: `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`, kind: "video" };
  return null;
}
