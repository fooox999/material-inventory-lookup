const STATUS_LABEL = { in_use: '使用中', closed: '已結案', abnormal: '異常' };
// 跟桌面版 material-inventory-gui/main.js 的 TX_TYPE_LABEL 保持一致（含 out 這個舊制型別）
const TX_TYPE_LABEL = {
  in: '進料', draw: '領用', return: '退料', use: '使用', out: '領用（舊）',
  move_out: '移出', move_in: '移入',
};

const state = {
  rows: [],
  transactions: [], // [{ material_id, type, quantity_change, note, created_at }]
  projects: [], // [{ name, rows, overQuotaCount }]
  currentProject: null, // null = all projects (search mode)
  searchKeyword: '',
  statusFilter: 'all',
};

const el = (id) => document.getElementById(id);
const els = {
  updatedAt: el('updatedAt'),
  btnRefresh: el('btnRefresh'),
  searchInput: el('searchInput'),
  btnBack: el('btnBack'),
  statusChips: el('statusChips'),
  loadingState: el('loadingState'),
  errorState: el('errorState'),
  projectListView: el('projectListView'),
  projectGrid: el('projectGrid'),
  tableView: el('tableView'),
  tableTitle: el('tableTitle'),
  dataTable: el('dataTable'),
  tableBody: el('tableBody'),
  emptyState: el('emptyState'),
  historyModal: el('historyModal'),
  historyTitle: el('historyTitle'),
  historyBody: el('historyBody'),
  historyClose: el('historyClose'),
};

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function parseCsv(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data || []),
      error: (err) => reject(err),
    });
  });
}

async function loadData() {
  if (!window.CSV_URL) {
    showError('尚未設定資料來源網址，請在 config.js 填入 Google Sheets 發布的 CSV 連結。');
    return;
  }
  els.loadingState.hidden = false;
  els.errorState.hidden = true;
  els.projectListView.hidden = true;
  els.tableView.hidden = true;

  try {
    const materialsData = await parseCsv(window.CSV_URL);
    state.rows = materialsData
      .filter((r) => r.id !== undefined && r.id !== '')
      .map((r) => ({
        id: r.id || '',
        project_no: r.project_no || '',
        status: STATUS_LABEL[r.status] ? r.status : 'in_use',
        part_no: r.part_no || '',
        name: r.name || '',
        // 空白儲存格代表這筆還沒被領用/使用/進料動過，沿用桌面版的邏輯：
        // 視為「目前庫存＝已領料」，而不是誤判成 0
        stock_qty: (r.stock_qty !== undefined && r.stock_qty !== null && String(r.stock_qty).trim() !== '')
          ? (Number(r.stock_qty) || 0)
          : (Number(r.drawn_total) || 0),
        drawn_total: Number(r.drawn_total) || 0,
        total_in: Number(r.total_in) || 0,
        remarks: r.remarks || '',
      }));

    // 異動紀錄是選配的：沒設定 TRANSACTIONS_CSV_URL 就跳過，主列表照常運作，
    // 只是點列不會有紀錄可看；讀取失敗也一樣不擋主流程。
    state.transactions = [];
    if (window.TRANSACTIONS_CSV_URL) {
      try {
        const txData = await parseCsv(window.TRANSACTIONS_CSV_URL);
        state.transactions = txData
          .filter((t) => t.material_id !== undefined && t.material_id !== '')
          .map((t) => ({
            material_id: t.material_id,
            type: t.type || '',
            quantity_change: Number(t.quantity_change) || 0,
            note: t.note || '',
            created_at: t.created_at || '',
          }));
      } catch (err) {
        console.warn('讀取異動紀錄失敗（不影響主列表）：', err.message);
      }
    }

    buildProjects();
    els.loadingState.hidden = true;
    els.updatedAt.textContent = `更新於 ${new Date().toLocaleString('zh-TW', { hour12: false })}`;
    renderCurrentView();
  } catch (err) {
    showError('讀取資料失敗：' + err.message);
  }
}

function showError(msg) {
  els.loadingState.hidden = true;
  els.errorState.hidden = false;
  els.errorState.textContent = msg;
}

function buildProjects() {
  const byProject = new Map();
  for (const r of state.rows) {
    const key = r.project_no || '（未填專案號）';
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key).push(r);
  }
  state.projects = [...byProject.entries()]
    .map(([name, rows]) => ({
      name,
      rows,
      overQuotaCount: rows.filter((r) => r.total_in > 0 && r.drawn_total > r.total_in).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
}

function renderCurrentView() {
  if (state.searchKeyword.trim() || state.currentProject) {
    renderTableView();
  } else {
    renderProjectListView();
  }
}

function renderProjectListView() {
  els.projectListView.hidden = false;
  els.tableView.hidden = true;
  els.btnBack.hidden = true;
  els.statusChips.hidden = true;

  els.projectGrid.innerHTML = state.projects.map((p) => `
    <button type="button" class="project-card" data-project="${escapeHtml(p.name)}">
      <div class="p-name">${escapeHtml(p.name)}</div>
      <div class="p-count">${p.rows.length} 筆料件</div>
      ${p.overQuotaCount > 0 ? `<div class="p-warn">⚠ ${p.overQuotaCount} 筆已超領</div>` : ''}
    </button>
  `).join('') || '<div class="state-msg">目前沒有任何資料</div>';
}

function getFilteredRows() {
  let rows = state.currentProject
    ? state.rows.filter((r) => (r.project_no || '（未填專案號）') === state.currentProject)
    : state.rows;

  const kw = state.searchKeyword.trim().toLowerCase();
  if (kw) {
    rows = rows.filter((r) =>
      r.part_no.toLowerCase().includes(kw) ||
      r.name.toLowerCase().includes(kw) ||
      r.project_no.toLowerCase().includes(kw)
    );
  }
  if (state.statusFilter !== 'all') {
    rows = rows.filter((r) => r.status === state.statusFilter);
  }
  return rows;
}

function renderTableView() {
  els.projectListView.hidden = true;
  els.tableView.hidden = false;
  els.btnBack.hidden = false;
  els.statusChips.hidden = false;

  els.tableTitle.textContent = state.currentProject
    ? `專案：${state.currentProject}`
    : '跨專案搜尋結果';
  els.dataTable.classList.toggle('single-project', !!state.currentProject);

  const rows = getFilteredRows();
  els.emptyState.hidden = rows.length > 0;
  els.tableBody.innerHTML = rows.map((r) => `
    <tr data-id="${escapeHtml(r.id)}" class="clickable-row" tabindex="0">
      <td data-label="專案號" class="col-project">${escapeHtml(r.project_no)}</td>
      <td data-label="狀態"><span class="status-tag ${r.status}">${STATUS_LABEL[r.status]}</span></td>
      <td data-label="品號">${escapeHtml(r.part_no)}</td>
      <td data-label="品名">${escapeHtml(r.name)}</td>
      <td data-label="庫存數量" class="num ${r.stock_qty > 0 ? 'stock-positive' : 'stock-zero'}">${r.stock_qty}</td>
      <td data-label="已領料" class="num ${r.total_in > 0 && r.drawn_total > r.total_in ? 'over-quota' : ''}">${r.drawn_total}</td>
      <td data-label="總進料數" class="num">${r.total_in || 0}</td>
      <td data-label="備註">${escapeHtml(r.remarks)}</td>
    </tr>
  `).join('');
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-TW', { hour12: false });
}

function openHistoryModal(materialId) {
  const material = state.rows.find((r) => String(r.id) === String(materialId));
  els.historyTitle.textContent = material ? `${material.part_no}　${material.name}` : '異動紀錄';

  if (!window.TRANSACTIONS_CSV_URL) {
    els.historyBody.innerHTML = '<div class="state-msg">尚未設定異動紀錄的資料來源</div>';
  } else {
    const records = state.transactions
      .filter((t) => String(t.material_id) === String(materialId))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

    els.historyBody.innerHTML = records.length
      ? `<table class="history-table">
          <thead><tr><th>時間</th><th>類型</th><th class="num">數量</th><th>備註</th></tr></thead>
          <tbody>${records.map((t) => `
            <tr>
              <td data-label="時間">${escapeHtml(formatDateTime(t.created_at))}</td>
              <td data-label="類型"><span class="tx-type tx-${escapeHtml(t.type)}">${escapeHtml(TX_TYPE_LABEL[t.type] || t.type)}</span></td>
              <td data-label="數量" class="num">${t.quantity_change}</td>
              <td data-label="備註">${escapeHtml(t.note)}</td>
            </tr>
          `).join('')}</tbody>
        </table>`
      : '<div class="state-msg">這筆料件目前沒有異動紀錄</div>';
  }

  els.historyModal.hidden = false;
}

function closeHistoryModal() {
  els.historyModal.hidden = true;
}

els.btnRefresh.addEventListener('click', loadData);

els.btnBack.addEventListener('click', () => {
  state.currentProject = null;
  state.searchKeyword = '';
  state.statusFilter = 'all';
  els.searchInput.value = '';
  document.querySelectorAll('#statusChips .chip').forEach((c) => c.classList.toggle('active', c.dataset.status === 'all'));
  renderCurrentView();
});

let searchDebounce;
els.searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.searchKeyword = els.searchInput.value;
    if (state.searchKeyword.trim() && !state.currentProject) {
      renderTableView();
    } else if (state.currentProject) {
      renderTableView();
    } else {
      renderCurrentView();
    }
  }, 200);
});

els.projectGrid.addEventListener('click', (e) => {
  const card = e.target.closest('.project-card');
  if (!card) return;
  state.currentProject = card.dataset.project;
  state.searchKeyword = '';
  state.statusFilter = 'all';
  els.searchInput.value = '';
  document.querySelectorAll('#statusChips .chip').forEach((c) => c.classList.toggle('active', c.dataset.status === 'all'));
  renderTableView();
});

els.statusChips.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#statusChips .chip').forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  state.statusFilter = chip.dataset.status;
  renderTableView();
});

els.tableBody.addEventListener('click', (e) => {
  const row = e.target.closest('tr[data-id]');
  if (!row) return;
  openHistoryModal(row.dataset.id);
});
els.tableBody.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const row = e.target.closest('tr[data-id]');
  if (!row) return;
  e.preventDefault();
  openHistoryModal(row.dataset.id);
});

els.historyClose.addEventListener('click', closeHistoryModal);
els.historyModal.addEventListener('click', (e) => {
  if (e.target === els.historyModal) closeHistoryModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.historyModal.hidden) closeHistoryModal();
});

loadData();
