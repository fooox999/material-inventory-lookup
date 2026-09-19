// 輕量進站密碼鎖。只擋「不小心點到連結／search晃進來」的人，不是真正的安全機制
// ——這個repo是public的，這支程式碼、config.js裡的雜湊值任何人都看得到，懂一點技術
// 想繞過的人還是進得去（看原始碼、開發者工具、或直接抓CSV_URL）。細節說明見config.js。

const STORAGE_KEY = 'inv_unlocked_v1';

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function loadAppScript() {
  const script = document.createElement('script');
  script.src = 'app.js?v=4';
  document.body.appendChild(script);
}

function unlock() {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* 私密瀏覽等情境下無法寫入，忽略即可 */ }
  document.getElementById('lockScreen').hidden = true;
  document.getElementById('appRoot').hidden = false;
  loadAppScript();
}

function showLockScreen() {
  const overlay = document.getElementById('lockScreen');
  const form = document.getElementById('lockForm');
  const input = document.getElementById('lockPassword');
  const errorEl = document.getElementById('lockError');
  overlay.hidden = false;
  input.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hash = await sha256Hex(input.value);
    if (hash === window.LOCK_PASSWORD_HASH) {
      errorEl.hidden = true;
      unlock();
    } else {
      errorEl.hidden = false;
      input.value = '';
      input.focus();
    }
  });
}

if (!window.LOCK_PASSWORD_HASH) {
  // 沒設定密碼雜湊就直接開放，避免設定錯誤把頁面永久鎖死
  document.getElementById('appRoot').hidden = false;
  loadAppScript();
} else {
  let alreadyUnlocked = false;
  try { alreadyUnlocked = localStorage.getItem(STORAGE_KEY) === '1'; } catch { /* 忽略 */ }

  if (alreadyUnlocked) {
    document.getElementById('appRoot').hidden = false;
    loadAppScript();
  } else {
    showLockScreen();
  }
}
