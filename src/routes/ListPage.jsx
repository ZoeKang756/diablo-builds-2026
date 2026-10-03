import { Link, useLocation, useSearchParams } from "react-router-dom";
import { CATEGORIES, CLASSES, PAGES } from "../data/pages.js";
import { classColor, contentSummary, displayTitle, fmtDate } from "../utils.js";
import ClassTag from "../components/ClassTag.jsx";

const ALL = "全部";

export default function ListPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const cls = params.get("class") || ALL;
  const cat = params.get("cat") || ALL;
  const q = params.get("q") || "";

  // 篩選條件存在網址上，重新整理或分享連結都會保留
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const counts = { [ALL]: PAGES.length };
  CLASSES.forEach((c) => (counts[c] = PAGES.filter((p) => p.class === c).length));

  const needle = q.trim().toLowerCase();
  const rows = PAGES.filter(
    (p) =>
      (cls === ALL || p.class === cls) &&
      (cat === ALL || p.category === cat) &&
      (!needle || displayTitle(p).toLowerCase().includes(needle))
  );

  return (
    <main className="wrap">
      <header className="masthead">
        <h1>暗黑不朽<br />配裝資訊匯總</h1>
        <p className="lede">各職業的配裝截圖與參考資料，目前整理到煉獄 14。</p>
      </header>

      <nav className="class-rail" aria-label="依職業篩選">
        {[ALL, ...CLASSES].map((c) => (
          <button
            key={c}
            className="rail-btn"
            aria-pressed={cls === c}
            style={{ "--tag": c === ALL ? "var(--gold)" : classColor(c) }}
            onClick={() => update("class", c)}
          >
            <span>{c}</span>
            <span className="rail-count">{counts[c]}</span>
          </button>
        ))}
      </nav>

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="依分類篩選">
          {[ALL, ...CATEGORIES].map((c) => (
            <button key={c} aria-pressed={cat === c} onClick={() => update("cat", c)}>
              {c}
            </button>
          ))}
        </div>
        <input
          className="search"
          type="search"
          placeholder="搜尋頁面標題"
          aria-label="搜尋頁面標題"
          value={q}
          onChange={(e) => update("q", e.target.value)}
        />
      </div>

      <div className="table" role="table" aria-label="配裝頁面">
        <div className="tr th" role="row">
          <span role="columnheader">頁面標題</span>
          <span role="columnheader">職業</span>
          <span role="columnheader">分類</span>
          <span role="columnheader">地圖等級</span>
          <span role="columnheader">整理日期</span>
        </div>
        {rows.map((p) => {
          const summary = contentSummary(p);
          return (
            <Link
              key={p.slug}
              className="tr"
              role="row"
              to={`/pages/${p.slug}`}
              state={{ from: location.search }}
            >
              <span className="td-title" role="cell">
                <span className={p.title ? "" : "muted"}>{displayTitle(p)}</span>
                <span className="summary">{summary || "尚無內容"}</span>
              </span>
              <span role="cell"><ClassTag cls={p.class} /></span>
              <span role="cell" className="td-meta">{p.category}</span>
              <span role="cell" className="td-meta">{p.tier || "—"}</span>
              <span role="cell" className="td-meta">{fmtDate(p.date)}</span>
            </Link>
          );
        })}
        {rows.length === 0 && (
          <div className="empty-row">沒有符合條件的頁面。試試切換職業或清除搜尋文字。</div>
        )}
      </div>
    </main>
  );
}
