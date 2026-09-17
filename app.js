const STATUS_LABEL = { in_use: '使用中', closed: '已結案', abnormal: '異常' };

const state = {
  rows: [],
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
};

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
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

  Papa.parse(window.CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      state.rows = (result.data || [])
        .filter((r) => r.id !== undefined && r.id !== '')
        .map((r) => ({
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
      buildProjects();
      els.loadingState.hidden = true;
      els.updatedAt.textContent = `更新於 ${new Date().toLocaleString('zh-TW', { hour12: false })}`;
      renderCurrentView();
    },
    error: (err) => {
      showError('讀取資料失敗：' + err.message);
    },
  });
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
    <tr>
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

loadData();
