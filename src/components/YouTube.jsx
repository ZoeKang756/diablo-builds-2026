import { useState } from "react";

// 點擊後才載入 iframe，避免一進頁面就載入多支 YouTube 播放器
export default function YouTube({ id }) {
  const [play, setPlay] = useState(false);
  return (
    <div className="video">
      {play ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title="YouTube 影片"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button className="video-poster" onClick={() => setPlay(true)} aria-label="播放影片">
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className="play" aria-hidden="true" />
        </button>
      )}
      <a className="video-link" href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">
        在 YouTube 開啟
      </a>
    </div>
  );
}
