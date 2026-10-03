import { Link, useLocation, useParams } from "react-router-dom";
import { PAGES, getPage } from "../data/pages.js";
import { CLASS_COLORS, displayTitle, fmtDate } from "../utils.js";
import ClassTag from "../components/ClassTag.jsx";
import Blocks from "../components/Blocks.jsx";
import NotFound from "./NotFound.jsx";

export default function PageDetail() {
  const { slug } = useParams();
  const { state } = useLocation();
  const page = getPage(slug);
  if (!page) return <NotFound />;

  // 回列表時保留原本的篩選條件
  const backTo = "/" + (state?.from || "");

  const idx = PAGES.indexOf(page);
  const prev = PAGES[idx - 1];
  const next = PAGES[idx + 1];

  const props = [
    ["職業", <ClassTag cls={page.class} />],
    ["分類", page.category],
    ["當前地圖等級", page.tier || "—"],
    ["整理日期", fmtDate(page.date)],
  ];

  return (
    <main className="wrap" style={{ "--tag": CLASS_COLORS[page.class] }}>
      <Link className="back" to={backTo}>‹ 回到配裝列表</Link>

      <header className="detail-head">
        <h1 className={page.title ? "" : "muted"}>{displayTitle(page)}</h1>
        <dl className="props">
          {props.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      {page.blocks.length > 0 ? (
        <Blocks key={page.slug} blocks={page.blocks} />
      ) : (
        <p className="empty-block">
          這一頁在 Notion 上還沒有內容。補上截圖後重新匯出，再把資料加進 src/data/pages.js。
        </p>
      )}

      <nav className="pager" aria-label="上一頁與下一頁">
        {prev ? (
          <Link to={`/pages/${prev.slug}`} state={state} className="pager-prev">
            <small>上一頁</small>
            <span>{displayTitle(prev)}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link to={`/pages/${next.slug}`} state={state} className="pager-next">
            <small>下一頁</small>
            <span>{displayTitle(next)}</span>
          </Link>
        ) : <span />}
      </nav>
    </main>
  );
}
