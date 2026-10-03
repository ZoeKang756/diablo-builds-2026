export const CLASS_COLORS = {
  血騎士: "var(--c-blood)",
  術士: "var(--c-warlock)",
  秘術師: "var(--c-wizard)",
  德魯伊: "var(--c-druid)",
};

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
