import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { CATEGORIES, CLASSES, PAGES } from "../data/pages.js";
import { classColor, contentSummary, pageThumb, displayTitle, fmtDate } from "../utils.js";
import ClassTag from "../components/ClassTag.jsx";

const ALL = "全部";

export default function ListPage() {
  const [params, setParams] = useSearchParams();
  const cls = params.get("class") || ALL;
  const cat = params.get("cat") || ALL;
  const q = params.get("q") || "";
  const filtersRef = useRef(null);
  const sentinelRef = useRef(null);
  const railRef = useRef(null);
  const [stuck, setStuck] = useState(false);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  // 職業列可以左右滑動時（手機版），依目前位置顯示左右箭頭
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const check = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const left = max > 1 && rail.scrollLeft > 1;
      const right = max > 1 && rail.scrollLeft < max - 1;
      setCanScroll((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };
    check();
    rail.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(rail);
    return () => {
      rail.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, []);

  // 每按一次箭頭捲動約七成寬度，保留一點前一頁的按鈕當參考
  const scrollRail = (dir) => {
    const rail = railRef.current;
    rail.scrollBy({ left: dir * rail.clientWidth * 0.7, behavior: "smooth" });
  };

  // 篩選列往上捲動後會固定在頂端；固定時加上陰影與精簡樣式
  useEffect(() => {
    const top = parseFloat(getComputedStyle(filtersRef.current).top) || 0;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), {
      rootMargin: `-${top + 1}px 0px 0px 0px`,
    });
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, []);

  // 手機上職業列可以左右滑動：確保選中的職業在可見範圍內（只捲動職業列本身，不動整頁）
  useEffect(() => {
    const rail = railRef.current;
    const btn = rail?.querySelector('[aria-pressed="true"]');
    if (!rail || !btn || rail.scrollWidth <= rail.clientWidth) return;
    const left = btn.offsetLeft - rail.offsetLeft;
    if (left < rail.scrollLeft || left + btn.offsetWidth > rail.scrollLeft + rail.clientWidth) {
      rail.scrollTo({ left: left - 16, behavior: "smooth" });
    }
  }, [cls]);

  // 固定狀態下切換篩選時，把列表捲回第一筆，避免停在空白處
  const scrollToList = () => {
    if (!stuck) return;
    const el = filtersRef.current;
    const y = el.offsetTop - (parseFloat(getComputedStyle(el).top) || 0);
    window.scrollTo({ top: y });
  };
  const location = useLocation();

  // 篩選條件存在網址上，重新整理或分享連結都會保留
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true, preventScrollReset: true });
    if (key !== "q") scrollToList();
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

      <div ref={sentinelRef} aria-hidden="true" />
      <div ref={filtersRef} className={`filters${stuck ? " is-stuck" : ""}`}>
        <div className="rail-wrap">
          <nav ref={railRef} className="class-rail" aria-label="依職業篩選">
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
          {canScroll.left && (
            <button
              type="button"
              className="rail-arrow rail-arrow-left"
              onClick={() => scrollRail(-1)}
              aria-label="職業列表向左捲動"
              tabIndex={-1}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
          )}
          {canScroll.right && (
            <button
              type="button"
              className="rail-arrow rail-arrow-right"
              onClick={() => scrollRail(1)}
              aria-label="職業列表向右捲動"
              tabIndex={-1}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>

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
      </div>

      {rows.length > 0 ? (
        <ul className="cards">
          {rows.map((p, i) => {
            const thumb = pageThumb(p);
            const summary = contentSummary(p);
            return (
              <li key={p.slug}>
                <Link
                  className="card"
                  to={`/pages/${p.slug}`}
                  state={{ from: location.search }}
                  style={{ "--tag": classColor(p.class) }}
                >
                  <div className="card-head">
                    <h2 className={`card-title${p.title ? "" : " muted"}`}>{displayTitle(p)}</h2>
                  </div>
                  <div className="card-thumb">
                    {/* 底圖：沒有縮圖或圖片載入失敗時顯示 */}
                    <div className="card-placeholder" aria-hidden="true">
                      {!thumb && <span className="class-sigil" />}
                    </div>
                    {thumb && (
                      <img
                        src={thumb.src}
                        alt=""
                        loading={i < 3 ? "eager" : "lazy"}
                        decoding="async"
                        onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                      />
                    )}
                    {thumb?.kind === "video" && <span className="card-play" aria-hidden="true" />}
                    <span className="card-count">{summary || "尚無內容"}</span>
                  </div>
                  <div className="card-body">
                    <div className="card-meta">
                      {p.class && <ClassTag cls={p.class} />}
                      {p.category && <span>{p.category}</span>}
                      {p.tier && <span>{p.tier}</span>}
                      <span>{fmtDate(p.date)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty-row">沒有符合條件的頁面。試試切換職業或清除搜尋文字。</div>
      )}
    </main>
  );
}
