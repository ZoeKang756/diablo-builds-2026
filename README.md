# 暗黑不朽配裝資訊匯總

把 Notion「暗黑不朽配裝資訊匯總」資料庫轉成的 React 網站（Vite + React 18 + React Router 6 + Swiper 11）。

## 開始使用

```bash
npm install
npm run dev      # 開發模式，預設 http://localhost:5173
npm run build    # 輸出到 dist/
npm run preview  # 預覽 build 結果
```

需要 Node.js 18 以上。

## 路由

| 網址 | 畫面 |
| --- | --- |
| `/` | 配裝列表（篩選條件存在網址上，例如 `/?class=術士&cat=配裝截圖`） |
| `/pages/:slug` | 單頁內容，例如 `/pages/general-pve` |
| 其他 | 找不到頁面 |

## 專案結構

```
src/
  main.jsx            路由設定（createBrowserRouter）
  data/pages.js       所有頁面資料（由匯入腳本自動產生）
  routes/             Layout、ListPage、PageDetail、NotFound
  components/         Gallery（Swiper 輪播）、YouTube、Blocks、ClassTag
  utils.js            職業顏色、日期格式等工具
  index.css           全站樣式（含深色／淺色、RWD）
public/images/<slug>/ 每頁的截圖（由匯入腳本自動產生）
scripts/
  import-notion.mjs       Notion 匯入腳本
  notion-overrides.json   頁面網址（slug）與截圖說明
```

## 從 Notion 更新資料

Notion 有新增或修改內容時，不需要手動改程式：

1. 在 Notion 資料庫頁面點「•••」→ Export，格式選 **HTML**，勾選包含子頁面。
2. 解壓縮下載的 zip。
3. 執行：

```bash
npm run import-notion -- <解壓縮後的資料夾>
```

腳本會依 Notion 列表的順序重新產生 `src/data/pages.js`，並把截圖複製到 `public/images/`（會先清空舊圖）。支援的內容有圖片、YouTube 影片、標題、文字段落和一般連結。

新頁面的網址會先用 `page-<ID 前 8 碼>`，腳本會印出提示。想用好記的網址，就在 `scripts/notion-overrides.json` 加上該頁的 ID 與 slug，也可以在這裡替截圖加上說明文字，然後重新執行一次匯入。

## 部署注意

使用 BrowserRouter，所以主機要把所有路徑導回 `index.html`，否則重新整理 `/pages/...` 會出現 404：

- **Netlify**：新增 `public/_redirects`，內容為 `/*  /index.html  200`
- **Vercel**：新增 `vercel.json`，設定 rewrites 到 `/index.html`
- **GitHub Pages**：不支援這種設定，建議把 `src/main.jsx` 的 `createBrowserRouter` 換成 `createHashRouter`，並把 `vite.config.js` 的 `base` 改成 `"/repo 名稱/"`
