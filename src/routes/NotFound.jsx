import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="wrap">
      <div className="empty-block">
        <h1 className="nf-title">找不到這個頁面</h1>
        <p>網址可能打錯了，或這一頁已經從 Notion 移除。</p>
        <Link className="btn" to="/">回到配裝列表</Link>
      </div>
    </main>
  );
}
