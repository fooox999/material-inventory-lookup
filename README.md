# material-inventory-lookup

純前端、唯讀的料件庫存查詢頁面，資料來源是 Google Sheets「發布到網路」的 CSV，用 GitHub Pages host。這是 [material-inventory-gui](https://github.com/fooox999/material-inventory-gui) 的唯讀對外版本，給不需要編輯權限、只需要查詢的人用。

線上網址：https://fooox999.github.io/material-inventory-lookup/

## 功能

- 依專案號分組瀏覽
- 依品號／品名／專案號搜尋
- 依狀態（使用中／已結案／異常）篩選
- 顯示庫存數量、已領料、總進料數、備註

## 運作方式

- `config.js` 指向 Google Sheets 用「檔案 > 共用 > 發布到網路」產生的公開 CSV 連結（Materials 分頁）。這個連結本身就是 Google 主動公開發布的唯讀資料，不是帳密或金鑰，可以放在這個 public repo 裡。
- `app.js` 用 [PapaParse](https://www.papaparse.com/) 讀取並解析 CSV，純前端渲染，沒有後端、沒有建置流程。
- 資料是唯讀顯示；要新增/編輯庫存資料，要用 [material-inventory-gui](https://github.com/fooox999/material-inventory-gui)（Electron桌面版，寫入權限）。

## 本機開發

沒有建置流程，直接用任何靜態伺服器打開 `index.html` 即可，例如：

```bash
npx serve .
```

## 部署

推到 `main` 分支，GitHub Pages 會自動重新部署。
