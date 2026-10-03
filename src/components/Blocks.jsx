import Gallery from "./Gallery.jsx";
import YouTube from "./YouTube.jsx";

export default function Blocks({ blocks }) {
  let galleryNo = 0; // 第幾個圖組（從 1 開始），用來記錄目前看到的位置
  return (
    <div className="blocks">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "gallery":
            galleryNo += 1;
            return <Gallery key={i} images={b.images} galleryNo={galleryNo} />;
          case "video":
            return <YouTube key={i} id={b.youtubeId} />;
          case "heading":
            return <h2 key={i} className="block-heading">{b.text}</h2>;
          case "text":
            return <p key={i} className="block-text">{b.text}</p>;
          case "link":
            return (
              <a key={i} className="block-link" href={b.url} target="_blank" rel="noreferrer">
                {b.url}
              </a>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
