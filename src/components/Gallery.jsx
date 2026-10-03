import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Keyboard, Navigation, Pagination, Zoom } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/zoom";
import { asset } from "../utils.js";

// 瀏覽器原生全螢幕（iPhone Safari 不支援元素全螢幕，改用覆蓋整個畫面的方式）
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
const canNativeFs = () =>
  typeof document !== "undefined" &&
  !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);

// 網址上的 ?img=圖組-張數（都從 1 開始），例如 ?img=2-4 是第 2 個圖組的第 4 張
const parseImg = (value) => {
  const m = (value || "").match(/^(\d+)-(\d+)$/);
  return m ? { gallery: Number(m[1]), index: Number(m[2]) - 1 } : null;
};

// 截圖輪播：左右箭頭 + 張數 + 全螢幕，手機可左右滑動，雙擊或雙指可放大
// 目前看到的張數會寫進網址，重新整理或分享連結都會停在同一張
export default function Gallery({ images, galleryNo = 1 }) {
  const frameRef = useRef(null);
  const [params, setParams] = useSearchParams();
  const paramsRef = useRef(params); // Swiper 事件裡永遠讀到最新的網址參數
  paramsRef.current = params;

  // 只在第一次顯示時讀取網址決定起始張數
  const [initial] = useState(() => {
    const saved = parseImg(params.get("img"));
    return saved && saved.gallery === galleryNo && saved.index < images.length ? saved.index : 0;
  });
  const [active, setActive] = useState(initial);

  // 從網址指定第 2 個以後的圖組時，捲動到那個圖組
  useEffect(() => {
    if (initial > 0 && galleryNo > 1) frameRef.current?.scrollIntoView({ block: "center" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSlideChange = (s) => {
    const index = s.realIndex;
    setActive(index);
    const latest = paramsRef.current;
    const current = latest.get("img");
    const ownsParam = parseImg(current)?.gallery === galleryNo;
    // 回到第一張：如果網址記的是這個圖組就清掉，記的是別的圖組就不動
    if (index === 0 && !ownsParam) return;
    const next = index === 0 ? null : `${galleryNo}-${index + 1}`;
    if (next === current) return;
    const updated = new URLSearchParams(latest);
    if (next) updated.set("img", next);
    else updated.delete("img");
    // replace：切換圖片不會塞滿瀏覽器的上一頁紀錄
    setParams(updated, { replace: true, preventScrollReset: true });
  };
  const [fullscreen, setFullscreen] = useState(false);
  const [fallback, setFallback] = useState(false); // 不支援原生全螢幕時的替代模式
  const caption = images[active]?.caption;
  const single = images.length < 2;

  const enter = useCallback(async () => {
    const el = frameRef.current;
    if (canNativeFs()) {
      try {
        await (el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen());
        // 截圖是橫的，手機上嘗試自動轉成橫向（不支援的瀏覽器會直接略過）
        await screen.orientation?.lock?.("landscape").catch(() => {});
        return;
      } catch {
        /* 失敗就改用替代模式 */
      }
    }
    setFallback(true);
    setFullscreen(true);
  }, []);

  const exit = useCallback(() => {
    if (fsElement()) {
      screen.orientation?.unlock?.();
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
    setFallback(false);
    setFullscreen(false);
  }, []);

  // 同步原生全螢幕狀態（使用者按 Esc 或系統返回鍵離開時）
  useEffect(() => {
    const onChange = () => setFullscreen(fsElement() === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // 替代模式：鎖住頁面捲動，Esc 可離開
  useEffect(() => {
    if (!fallback) return;
    const onKey = (e) => e.key === "Escape" && exit();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [fallback, exit]);

  return (
    <section className="gallery" aria-label="配裝截圖">
      <div
        ref={frameRef}
        className={`gallery-frame${fullscreen ? " is-fullscreen" : ""}${fallback ? " is-fallback" : ""}`}
      >
        <Swiper
          modules={[Navigation, Pagination, Keyboard, Zoom, A11y]}
          navigation={!single}
          pagination={single ? false : { type: "fraction" }}
          keyboard={{ enabled: true, onlyInViewport: true }}
          zoom={{ maxRatio: 3 }}
          loop={!single}
          initialSlide={initial}
          spaceBetween={12}
          onSlideChange={handleSlideChange}
          a11y={{ prevSlideMessage: "上一張", nextSlideMessage: "下一張" }}
        >
          {images.map((img, i) => (
            <SwiperSlide key={img.src}>
              <div className="swiper-zoom-container">
                <img
                  src={asset(img.src)}
                  alt={img.caption || `截圖 ${i + 1}`}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        <button
          type="button"
          className="fs-btn"
          onClick={fullscreen ? exit : enter}
          aria-label={fullscreen ? "離開全螢幕" : "全螢幕檢視"}
          title={fullscreen ? "離開全螢幕（Esc）" : "全螢幕檢視"}
        >
          {fullscreen ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          )}
        </button>

        {fullscreen && caption && <p className="fs-caption">{caption}</p>}
      </div>
      {caption && <p className="gallery-caption">{caption}</p>}
    </section>
  );
}
