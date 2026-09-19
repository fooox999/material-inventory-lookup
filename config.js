// 這裡填入 Google Sheets「發布到網路」產生的 CSV 網址（Materials 分頁）
// 檔案 > 共用 > 發布到網路 > 選擇 Materials 分頁 > 格式選 csv > 發布
window.CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRhS8IQ9Lgyhur4x19Dzp2jhpY9wWq_EFEVDNLbERrKSEzRKsHXLTf1H8A5__yAcEnh1LL2N5v-UHgG/pub?gid=1518031987&single=true&output=csv';

// 進站密碼的 SHA-256 雜湊值（不是明碼）。只是擋隨便路過的人，不是真正的安全機制——
// 這個repo是public的，頁面原始碼、下面這個雜湊值任何人都看得到，懂一點技術的人可以離線
// 硬碰硬破解或直接繞過前端檢查去抓CSV_URL本身。要真的擋住蓄意的人，需要換成有後端驗證
// 的架構。要換密碼：把新密碼丟給任何SHA-256工具算出雜湊，貼在這裡取代掉即可。
window.LOCK_PASSWORD_HASH = '98fb18550231d56dab1e654301b2f03a6c130bd54c4878ccf590f5efd0864d08';

// Transactions 分頁發布的 CSV 網址（點一筆料件查看異動紀錄用）。
// 步驟同上：檔案 > 共用 > 發布到網路 > 選擇 Transactions 分頁 > 格式選 csv > 發布
window.TRANSACTIONS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRhS8IQ9Lgyhur4x19Dzp2jhpY9wWq_EFEVDNLbERrKSEzRKsHXLTf1H8A5__yAcEnh1LL2N5v-UHgG/pub?gid=1958207577&single=true&output=csv';
