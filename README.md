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
| `/#/` | 配裝列表（篩選條件存在網址上，例如 `/#/?class=術士&cat=配裝截圖`） |
| `/#/pages/:slug` | 單頁內容，例如 `/#/pages/general-pve` |
| 其他 | 找不到頁面 |

## 專案結構

```
src/
  main.jsx            路由設定（createHashRouter）
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

Notion 有新增或修改內容時，不需要手動改程式。匯出時格式選 **HTML**，下載後先解壓縮。

### 完整匯入：整個資料庫

在 Notion 資料庫頁面點「•••」→ Export，勾選包含子頁面，然後執行：

```bash
npm run import-notion -- ~/Downloads/<資料夾名稱>
```

依 Notion 列表的順序重建所有頁面，舊資料和舊截圖會全部替換。

### 單頁匯入：只更新或新增幾頁

打開要匯出的那一頁，點右上角「•••」→ Export，然後執行：

```bash
npm run import-notion -- ~/Downloads/<資料夾名稱> --page
```

- 已經存在的頁面會原地更新，列表位置和網址都不變，只替換這一頁的截圖。
- 新頁面會加在列表最後。想調整順序，下次用完整匯入即可。
- 其他頁面和截圖都不會被動到。
- 資料夾裡只有單一頁面、沒有資料庫時，就算沒加 `--page` 也會自動用單頁匯入。

### 網址與截圖說明

新頁面的網址會先用 `page-<ID 前 8 碼>`，腳本會印出提示和頁面 ID。想用好記的網址，就在 `scripts/notion-overrides.json` 加上該頁的 ID 與 slug，也可以在這裡替截圖加上說明文字，然後重新匯入一次那一頁。

### 刪除頁面

匯入腳本不會刪除頁面。在 Notion 刪掉頁面後，用完整匯入重建即可。

## 部署

```bash
npm run build
```

把 `dist/` 資料夾整個上傳到任何靜態主機即可（Netlify、Vercel、GitHub Pages、一般虛擬主機都可以），放在根目錄或子路徑都能運作。

網站使用 HashRouter，網址會是 `/#/pages/general-pve` 這種格式。好處是重新整理或直接開啟內頁網址都不會出現 404，不需要另外設定伺服器。
