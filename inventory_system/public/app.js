// ============================================================
// InvSys — Inventory Control System — Frontend Logic
// ============================================================

// ---- UTILITIES ----

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatCurrency(n) {
  const v = Number(n) || 0;
  if (v >= 1e7) return '₹' + (v/1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return '₹' + (v/1e5).toFixed(2) + ' L';
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatNumber(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

function formatDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ---- TOAST NOTIFICATIONS ----

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ---- CONFIRM MODAL ----

function showConfirm(title, message) {
  return new Promise((resolve) => {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = message;
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('hidden');
    const ok = document.getElementById('confirmOk');
    const cancel = document.getElementById('confirmCancel');
    function cleanup(val) {
      modal.classList.add('hidden');
      ok.replaceWith(ok.cloneNode(true));
      cancel.replaceWith(cancel.cloneNode(true));
      resolve(val);
    }
    document.getElementById('confirmOk').addEventListener('click', () => cleanup(true), { once: true });
    document.getElementById('confirmCancel').addEventListener('click', () => cleanup(false), { once: true });
  });
}

// ---- LOADING STATE ----

function setLoading(tbodyId, cols) {
  const tbody = document.querySelector(`#${tbodyId} tbody`);
  if (tbody) tbody.innerHTML = `<tr><td colspan="${cols}" class="loading-cell"><span class="spinner"></span> Loading...</td></tr>`;
}

// ---- CLOCK ----

function startClock() {
  const el = document.getElementById('topbarClock');
  function tick() {
    const now = new Date();
    el.textContent = now.toLocaleString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: true });
  }
  tick();
  setInterval(tick, 1000);
}

// ---- SECTIONS ----

function showSection(id) {
  document.querySelectorAll('main .page').forEach(s => s.classList.add('hidden'));
  const sec = document.getElementById(id);
  if (sec) { sec.classList.remove('hidden'); sec.classList.add('active'); }
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(a => a.classList.remove('active'));
  const link = document.getElementById(`nav-${id}`);
  if (link) link.classList.add('active');
  window.location.hash = id;
}

// Sidebar nav
document.querySelectorAll('.sidebar-nav .nav-item').forEach(link => {
  link.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const sec = href.slice(1);
      showSection(sec);
      sectionLoader(sec);
    }
  });
});

function sectionLoader(sec) {
  if (sec === 'dashboard') loadDashboard();
  else if (sec === 'items') loadItems();
  else if (sec === 'stock') loadStockTable();
  else if (sec === 'requests') loadRequests();
  else if (sec === 'stats') { loadAnalytics(); loadReport('low-stock'); }
  else if (sec === 'locations') { loadLocations(); loadWarehouses(); }
  else if (sec === 'users') loadUsers();
  else if (sec === 'audit') loadAudit();
}

// ============================================================
// AUTH
// ============================================================

async function checkAuth() {
  try {
    const res = await fetch('/api/user');
    if (!res.ok) { window.location.href = '/login.html'; return; }
    const data = await res.json();
    window.currentUser = data;
    window.currentRole = data.role;

    document.getElementById('usernameDisplay').textContent = data.fullname || data.username;
    document.getElementById('userAvatar').textContent = (data.fullname || data.username)[0].toUpperCase();

    const badge = document.getElementById('roleBadge');
    badge.textContent = data.role.charAt(0).toUpperCase() + data.role.slice(1);
    badge.className = `user-role-badge role-${data.role}`;

    // Show role-based nav items
    if (data.role === 'admin' || data.role === 'manager') {
      ['nav-locations','nav-users','nav-audit'].forEach(id => {
        document.getElementById(id)?.classList.remove('hidden');
      });
      document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }
    if (data.role !== 'admin') {
      // Non-admins can't change manager assignment
      document.querySelector('.admin-only')?.classList.add('hidden');
    }
    if (data.role === 'admin') {
      ['nav-locations','nav-warehouses','nav-users','nav-audit','nav-reports'].forEach(id => {
        document.getElementById(id)?.classList.remove('hidden');
      });
    }

    toggleRoleField();
    loadDashboard(); // Start with dashboard
    initRealtimeAlerts();
  } catch (err) {
    window.location.href = '/login.html';
  }
}

// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    if (!res.ok) throw new Error();
    const d = await res.json();

    // KPIs
    document.getElementById('kpi-items').textContent = formatNumber(d.kpis.total_items);
    document.getElementById('kpi-units').textContent = formatNumber(d.kpis.total_units);
    document.getElementById('kpi-value').textContent = formatCurrency(d.kpis.total_value);
    document.getElementById('kpi-low').textContent = d.kpis.low_stock;
    document.getElementById('kpi-out').textContent = d.kpis.out_of_stock;
    document.getElementById('kpi-wh').textContent = d.kpis.total_warehouses;
    if (document.getElementById('kpi-active-users')) {
      document.getElementById('kpi-active-users').textContent = d.kpis.active_users;
    }

    // Global alert
    if (d.kpis.low_stock > 0 || d.kpis.out_of_stock > 0) {
      const alertEl = document.getElementById('globalAlert');
      alertEl.classList.remove('hidden');
      document.getElementById('globalAlertText').textContent =
        `${d.kpis.low_stock} low stock · ${d.kpis.out_of_stock} out of stock`;
    }

    // Top items
    const topItemsTbody = document.querySelector('#dashTopItems tbody');
    topItemsTbody.innerHTML = d.top_items.map(item => `
      <tr>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td><span class="cat-badge">${escapeHtml(item.category || '—')}</span></td>
        <td>${formatNumber(item.total_qty)}</td>
        <td>${formatCurrency(item.total_value)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="empty-cell">No data</td></tr>';

    // Top warehouses
    const topWhTbody = document.querySelector('#dashTopWarehouses tbody');
    topWhTbody.innerHTML = d.top_warehouses.map(wh => `
      <tr>
        <td><strong>${escapeHtml(wh.warehouse_name)}</strong></td>
        <td>${escapeHtml(wh.state || '—')}</td>
        <td>${formatNumber(wh.total_stock)}</td>
        <td>${wh.item_types}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="empty-cell">No data</td></tr>';

    // Activity feed
    const feed = document.getElementById('dashActivity');
    feed.innerHTML = d.recent_activity.map(a => {
      const delta = a.new_quantity - a.old_quantity;
      const sign = delta >= 0 ? '+' : '';
      const cls = delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : 'delta-zero';
      return `
        <div class="activity-item">
          <div class="activity-meta">
            <span class="activity-type type-${a.change_type}">${a.change_type}</span>
            <span class="activity-time">${formatDate(a.changed_at)}</span>
          </div>
          <div class="activity-detail">
            <strong>${escapeHtml(a.item_name)}</strong> @ ${escapeHtml(a.warehouse_name)}
          </div>
          <div class="activity-qty">
            ${a.old_quantity} → ${a.new_quantity} <span class="${cls}">(${sign}${delta})</span>
            <small>by ${escapeHtml(a.changed_by || 'System')}</small>
          </div>
        </div>`;
    }).join('') || '<p class="empty-cell">No recent activity</p>';

    // Category chart
    if (d.category_breakdown && d.category_breakdown.length > 0) {
      renderCategoryChart(d.category_breakdown);
    }

  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

let catChart;
function renderCategoryChart(data) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  const labels = data.map(c => c.category || 'General');
  const values = data.map(c => Number(c.total_value || 0));
  const colors = ['#6366f1','#22d3ee','#10b981','#f59e0b','#ef4444','#a855f7','#f97316','#14b8a6','#ec4899','#84cc16'];

  if (catChart) { catChart.destroy(); catChart = null; }
  catChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#1e1e2e' }] },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right', labels: { color: '#a0aec0', font: { size: 11 } } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}` } }
      }
    }
  });
}

// ============================================================
// ITEMS / PRODUCTS
// ============================================================

let allItems = [];
let lowStockFilterActive = false;

async function loadItems() {
  setLoading('itemsTable', 10);
  try {
    const params = new URLSearchParams();
    if (lowStockFilterActive) params.set('low_stock', '1');
    const res = await fetch('/api/inventory?' + params.toString());
    if (!res.ok) { if (res.status === 401) window.location.href='/login.html'; return; }
    allItems = await res.json();
    renderItems(allItems);
    loadCategories();
    populateCategoryFilter(allItems);
  } catch (err) {
    showToast('Failed to load products', 'error');
  }
}

async function loadCategories() {
  const res = await fetch('/api/categories');
  if (!res.ok) return;
  const cats = await res.json();
  const dl = document.getElementById('categoryList');
  if (dl) dl.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');
  const cf = document.getElementById('categoryFilter');
  if (cf) {
    const cur = cf.value;
    cf.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    cf.value = cur;
  }
}

function populateCategoryFilter(items) {
  const cf = document.getElementById('categoryFilter');
  if (!cf) return;
  const cats = Array.from(new Set(items.map(i => i.category).filter(Boolean))).sort();
  const cur = cf.value;
  cf.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  cf.value = cur;
}

function getStatusBadge(qty, reorder) {
  if (qty === 0) return '<span class="badge badge-danger">Out of Stock</span>';
  if (qty < reorder) return '<span class="badge badge-warning">Low Stock</span>';
  return '<span class="badge badge-success">In Stock</span>';
}

function renderItems(items) {
  const tbody = document.querySelector('#itemsTable tbody');
  const empty = document.getElementById('emptyState');
  if (items.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = items.map(it => `
    <tr>
      <td><strong>${escapeHtml(it.name)}</strong></td>
      <td><code>${escapeHtml(it.sku)}</code></td>
      <td><span class="cat-badge">${escapeHtml(it.category || '—')}</span></td>
      <td>${escapeHtml(it.brand || '—')}</td>
      <td class="text-right">₹${Number(it.unit_price || 0).toLocaleString('en-IN')}</td>
      <td class="text-right"><strong>${formatNumber(it.total_quantity)}</strong></td>
      <td class="text-right">${formatCurrency(it.total_value)}</td>
      <td class="text-right">${it.reorder_level}</td>
      <td>${getStatusBadge(it.total_quantity, it.reorder_level)}</td>
      <td class="actions">
        <button data-id="${it.id}" class="btn btn-sm item-view" title="View Details">👁️</button>
        <button data-id="${it.id}" class="btn btn-sm btn-edit item-edit" title="Edit">✏️</button>
        <button data-id="${it.id}" class="btn btn-sm btn-danger item-delete" title="Delete">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// Search and filter
document.getElementById('searchBox')?.addEventListener('input', filterItems);
document.getElementById('categoryFilter')?.addEventListener('change', filterItems);
document.getElementById('lowStockFilterBtn')?.addEventListener('click', function() {
  lowStockFilterActive = !lowStockFilterActive;
  this.classList[lowStockFilterActive ? 'add' : 'remove']('active');
  this.textContent = lowStockFilterActive ? '✅ Showing Low Stock' : '⚠️ Low Stock Only';
  loadItems();
});

function filterItems() {
  const q = document.getElementById('searchBox')?.value.toLowerCase() || '';
  const cat = document.getElementById('categoryFilter')?.value || '';
  const filtered = allItems.filter(it =>
    (!q || it.name.toLowerCase().includes(q) || (it.sku||'').toLowerCase().includes(q)) &&
    (!cat || it.category === cat)
  );
  renderItems(filtered);
}

// Item form
document.getElementById('itemForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('itemId').value;
  const payload = {
    name: document.getElementById('name').value.trim(),
    sku: document.getElementById('sku').value.trim(),
    category: document.getElementById('category').value.trim() || 'General',
    brand: document.getElementById('brand').value.trim(),
    unit_price: Number(document.getElementById('unit_price').value || 0),
    reorder_level: Number(document.getElementById('reorder_level').value || 10),
    supplier: document.getElementById('supplier').value.trim(),
    unit_of_measure: document.getElementById('unit_of_measure').value.trim() || 'Units',
    description: document.getElementById('description').value.trim()
  };
  try {
    const url = id ? `/api/items/${id}` : '/api/items';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Save failed', 'error'); return; }
    showToast(id ? 'Product updated!' : 'Product created!', 'success');
    resetItemForm();
    await loadItems();
  } catch {
    showToast('Failed to save product', 'error');
  }
});

document.getElementById('resetBtn')?.addEventListener('click', resetItemForm);

function resetItemForm() {
  document.getElementById('itemId').value = '';
  document.getElementById('itemFormTitle').textContent = '➕ Add New Product';
  ['name','sku','category','brand','description','supplier','unit_of_measure'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  document.getElementById('unit_price').value = '0';
  document.getElementById('reorder_level').value = '10';
}

document.getElementById('itemsTable')?.addEventListener('click', async e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.classList.contains('item-delete')) {
    const ok = await showConfirm('Delete Product', 'This will deactivate the product. Stock history will be preserved.');
    if (!ok) return;
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showToast(data.error, 'error'); return; }
    showToast('Product deactivated', 'success');
    await loadItems();
  }
  if (btn.classList.contains('item-edit')) {
    const it = allItems.find(x => x.id == id);
    if (it) {
      document.getElementById('itemId').value = it.id;
      document.getElementById('name').value = it.name;
      document.getElementById('sku').value = it.sku;
      document.getElementById('category').value = it.category || '';
      document.getElementById('brand').value = it.brand || '';
      document.getElementById('unit_price').value = it.unit_price || 0;
      document.getElementById('reorder_level').value = it.reorder_level || 10;
      document.getElementById('supplier').value = it.supplier || '';
      document.getElementById('unit_of_measure').value = it.unit_of_measure || 'Units';
      document.getElementById('description').value = it.description || '';
      document.getElementById('itemFormTitle').textContent = '✏️ Edit Product';
      document.querySelector('#items .glass-card').scrollIntoView({ behavior: 'smooth' });
    }
  }
  if (btn.classList.contains('item-view')) {
    showProductDetails(id);
  }
});

async function showProductDetails(id) {
  try {
    const res = await fetch(`/api/inventory/${id}`);
    if (!res.ok) throw new Error();
    const d = await res.json();

    document.getElementById('productTitle').textContent = d.name;
    document.getElementById('productSku').textContent = d.sku;
    document.getElementById('productCategory').textContent = d.category || '—';
    document.getElementById('productBrand').textContent = d.brand || '—';
    document.getElementById('productPrice').textContent = `₹${Number(d.unit_price||0).toLocaleString('en-IN')}`;
    document.getElementById('productTotalStock').textContent = formatNumber(d.total_quantity);
    document.getElementById('productReorder').textContent = d.reorder_level;

    const tbody = document.getElementById('productStockList');
    tbody.innerHTML = d.stock_by_warehouse?.map(s => {
      const statusBadge = s.quantity === 0
        ? '<span class="badge badge-danger">Out</span>'
        : s.quantity < d.reorder_level ? '<span class="badge badge-warning">Low</span>'
          : '<span class="badge badge-success">OK</span>';
      return `
        <tr>
          <td><strong>${escapeHtml(s.warehouse_name)}</strong></td>
          <td>${escapeHtml(s.state || '—')}</td>
          <td>${escapeHtml(s.country || '—')}</td>
          <td class="text-right">${formatNumber(s.quantity)}</td>
          <td>${statusBadge}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" class="empty-cell">No stock recorded for this product</td></tr>';

    document.getElementById('productModal').classList.remove('hidden');
  } catch {
    showToast('Failed to load product details', 'error');
  }
}

function closeProductModal() {
  const mod = document.getElementById('productModal');
  if (mod) mod.classList.add('hidden');
}
// Escape key handled below globally for all modals
document.addEventListener('keydown', e => { 
  if (e.key === 'Escape') {
    closeProductModal();
    if(typeof closeLocationModal === 'function') closeLocationModal();
  }
});

// ============================================================
// STOCK
// ============================================================

let allStock = [];

async function loadStockTable() {
  setLoading('stockTable', 10);
  try {
    const res = await fetch('/api/all-stock');
    if (!res.ok) { if (res.status === 401) window.location.href='/login.html'; return; }
    allStock = await res.json();
    renderStockTable(allStock);
    populateStockFilters();
    updateStockSummary(allStock);
  } catch {
    showToast('Failed to load stock data', 'error');
  }
}

function updateStockSummary(stocks) {
  const bar = document.getElementById('stockSummaryBar');
  if (!bar) return;
  const total = stocks.reduce((s, r) => s + r.quantity, 0);
  const low = stocks.filter(r => r.quantity > 0 && r.quantity < r.reorder_level).length;
  const out = stocks.filter(r => r.quantity === 0).length;
  const val = stocks.reduce((s, r) => s + (r.quantity * (r.unit_price || 0)), 0);
  bar.innerHTML = `
    <span class="sb-item">📦 <strong>${formatNumber(total)}</strong> Total Units</span>
    <span class="sb-item warning">⚠️ <strong>${low}</strong> Low Stock</span>
    <span class="sb-item danger">❌ <strong>${out}</strong> Out of Stock</span>
    <span class="sb-item success">₹ <strong>${formatCurrency(val)}</strong> Value</span>
  `;
}

function renderStockTable(stocks) {
  const tbody = document.querySelector('#stockTable tbody');
  const empty = document.getElementById('stockEmpty');
  if (stocks.length === 0) {
    tbody.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');
  tbody.innerHTML = stocks.map(s => {
    const status = s.quantity === 0
      ? '<span class="badge badge-danger">Out</span>'
      : s.quantity < s.reorder_level
        ? '<span class="badge badge-warning">Low</span>'
        : '<span class="badge badge-success">OK</span>';
        
    const isRecent = s.last_login && (new Date() - new Date(s.last_login)) < 86400000;
    const activeBadge = isRecent ? ' <span class="badge-active-dot" title="Active Today"></span>' : '';

    return `
      <tr>
        <td><strong>${escapeHtml(s.name)}</strong>${activeBadge}</td>
        <td><code>${escapeHtml(s.sku)}</code></td>
        <td><span class="cat-badge">${escapeHtml(s.category || '—')}</span></td>
        <td>${escapeHtml(s.warehouse_name)}</td>
        <td>${escapeHtml(s.manager_name || '—')}</td>
        <td>${escapeHtml(s.state || '—')} / ${escapeHtml(s.country || '—')}</td>
        <td class="text-right">
          <input type="number" class="qty-input" data-id="${s.id}" value="${s.quantity}" min="0">
        </td>
        <td class="text-right">
          <input type="number" class="reorder-input" data-inv="${s.inventory_id}" value="${s.reorder_level}" min="0" style="width:60px;">
        </td>
        <td>${status}</td>
        <td>
          <button class="btn btn-sm btn-primary stock-save" data-id="${s.id}" title="Save Stock">💾</button>
          <button class="btn btn-sm btn-purple reorder-save" data-inv="${s.inventory_id}" title="Save Reorder Level">🔔</button>
        </td>
      </tr>`;
  }).join('');

  document.querySelectorAll('.stock-save').forEach(btn => {
    btn.addEventListener('click', async () => {
      const stockId = btn.dataset.id;
      const input = document.querySelector(`.qty-input[data-id="${stockId}"]`);
      const qty = Number(input.value);
      if (isNaN(qty) || qty < 0) { showToast('Invalid quantity', 'warning'); return; }
      btn.textContent = '⏳';
      btn.disabled = true;
      const res = await fetch(`/api/stock/${stockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty })
      });
      btn.textContent = '💾'; btn.disabled = false;
      if (res.ok) {
        showToast('Stock updated!', 'success');
        await loadStockTable();
      } else {
        const d = await res.json();
        showToast(d.error || 'Update failed', 'error');
      }
    });
  });

  document.querySelectorAll('.reorder-save').forEach(btn => {
    btn.addEventListener('click', async () => {
      const invId = btn.dataset.inv;
      const input = document.querySelector(`.reorder-input[data-inv="${invId}"]`);
      const level = Number(input.value);
      if (isNaN(level) || level < 0) { showToast('Invalid reorder level', 'warning'); return; }
      btn.textContent = '⏳';
      btn.disabled = true;
      const res = await fetch(`/api/inventory/${invId}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorder_level: level })
      });
      btn.textContent = '🔔'; btn.disabled = false;
      if (res.ok) {
        showToast('Reorder level updated!', 'success');
        await loadStockTable();
      } else {
        const d = await res.json();
        showToast(d.error || 'Update failed', 'error');
      }
    });
  });
}

function populateStockFilters() {
  const whSel = document.getElementById('stockWarehouse');
  const whs = Array.from(new Set(allStock.map(s => s.warehouse_name).filter(Boolean)));
  const curWh = whSel.value;
  whSel.innerHTML = '<option value="">All Warehouses</option>' + whs.map(w => `<option value="${w}">${w}</option>`).join('');
  whSel.value = curWh;

  if (window.currentRole === 'admin') {
    const mgSel = document.getElementById('stockManager');
    mgSel.style.display = '';
    const mgs = Array.from(new Set(allStock.map(s => s.manager_name).filter(Boolean)));
    const curMg = mgSel.value;
    mgSel.innerHTML = '<option value="">All Managers</option>' + mgs.map(m => `<option value="${m}">${m}</option>`).join('');
    mgSel.value = curMg;
  }
}

document.getElementById('stockWarehouse')?.addEventListener('change', filterStock);
document.getElementById('stockManager')?.addEventListener('change', filterStock);
document.getElementById('stockSearch')?.addEventListener('input', filterStock);
document.getElementById('stockStatus')?.addEventListener('change', filterStock);

function filterStock() {
  const wh = document.getElementById('stockWarehouse')?.value || '';
  const mg = document.getElementById('stockManager')?.value || '';
  const q = (document.getElementById('stockSearch')?.value || '').toLowerCase();
  const st = document.getElementById('stockStatus')?.value || '';
  const filtered = allStock.filter(s => {
    const whOk = !wh || s.warehouse_name === wh;
    const mgOk = !mg || s.manager_name === mg;
    const qOk = !q || s.name.toLowerCase().includes(q) || (s.sku||'').toLowerCase().includes(q);
    let stOk = true;
    if (st === 'out') stOk = s.quantity === 0;
    else if (st === 'low') stOk = s.quantity > 0 && s.quantity < s.reorder_level;
    else if (st === 'ok') stOk = s.quantity >= s.reorder_level;
    return whOk && mgOk && qOk && stOk;
  });
  renderStockTable(filtered);
  updateStockSummary(filtered);
}

// ============================================================
// STOCK REQUESTS
// ============================================================

let allRequests = [];

async function loadRequests() {
  const res = await fetch('/api/stock-requests');
  if (!res.ok) return;
  allRequests = await res.json();
  
  const [invRes, whRes] = await Promise.all([fetch('/api/inventory'), fetch('/api/warehouses')]);
  if (invRes.ok) {
    const inv = await invRes.json();
    document.getElementById('reqProduct').innerHTML = '<option value="">Select Product...</option>' + 
      inv.map(i => `<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('');
  }
  if (whRes.ok) {
    const whs = await whRes.json();
    const allWhOts = '<option value="">None (Supplier/Main)</option>' + 
      whs.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');
    
    let destWhs = whs;
    if (window.currentRole === 'manager') {
       // Filter destination to only warehouses they manage
       const mRes = await fetch('/api/warehouses?managed=1');
       if (mRes.ok) destWhs = await mRes.json();
    }
    
    const destWhOpts = destWhs.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');

    document.getElementById('reqFrom').innerHTML = allWhOts;
    document.getElementById('reqTo').innerHTML = '<option value="">Select Destination...</option>' + destWhOpts;
  }
  
  renderRequests();
}

function setReqTab(tab) {
  document.querySelectorAll('.report-tab[data-req]').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-req="${tab}"]`)?.classList.add('active');
  renderRequests(tab);
}

function renderRequests(tab = 'incoming') {
  const tbody = document.querySelector('#requestsTable tbody');
  const empty = document.getElementById('requestsEmpty');
  
  if (allRequests.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  
  tbody.innerHTML = allRequests.map(r => {
    const statusColors = { pending:'badge-warning', approved:'badge-info', rejected:'badge-danger', shipped:'badge-purple', received:'badge-success' };
    
    let actions = '';
    const isAdmin = window.currentRole === 'admin';
    const currentUid = window.currentUser?.id;
    const isSourceManager = currentUid === r.from_manager_id;
    const isDestManager = currentUid === r.to_manager_id;

    if (r.status === 'pending') {
      const canAct = isAdmin || (r.from_warehouse_id ? isSourceManager : isDestManager);
      if (canAct) {
        actions += `<button class="btn btn-sm btn-success" onclick="openActModal(${r.id}, 'approved')">Approve</button> `;
        actions += `<button class="btn btn-sm btn-danger" onclick="openActModal(${r.id}, 'rejected')">Reject</button>`;
      }
    } else if (r.status === 'approved') {
      if (isAdmin || isSourceManager || !r.from_warehouse_id) {
        actions += `<button class="btn btn-sm btn-purple" onclick="openActModal(${r.id}, 'shipped')">Ship</button>`;
      }
    } else if (r.status === 'shipped') {
      if (isAdmin || isDestManager) {
        actions += `<button class="btn btn-sm btn-success" onclick="openActModal(${r.id}, 'received')">Receive</button>`;
      }
    }
    
    let reasonText = r.reason ? `<br><small class="text-danger">Reason: ${escapeHtml(r.reason)}</small>` : '';
    let shipText = r.shipping_type ? `<br><small>Via: ${escapeHtml(r.shipping_type)} (${escapeHtml(r.driver_details||'')})</small>` : '';
    
    return `
      <tr>
        <td>#REQ-${r.id}</td>
        <td>${formatDate(r.created_at)}</td>
        <td><strong>${escapeHtml(r.item_name)}</strong><br><code class="text-xs">${escapeHtml(r.sku)}</code></td>
        <td>${escapeHtml(r.from_warehouse || 'Supplier/Main')}</td>
        <td>${escapeHtml(r.to_warehouse)}</td>
        <td class="text-right"><strong>${r.quantity}</strong></td>
        <td>
          <span class="badge ${statusColors[r.status]||''}">${r.status.toUpperCase()}</span>
          ${reasonText}
          ${shipText}
        </td>
        <td class="actions">${actions}</td>
      </tr>
    `;
  }).join('');
}

function openRequestModal() {
  document.getElementById('newReqModal').classList.remove('hidden');
}
function closeReqModal(id) {
  document.getElementById(id).classList.add('hidden');
}

document.getElementById('newReqForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    inventory_id: document.getElementById('reqProduct').value,
    from_warehouse_id: document.getElementById('reqFrom').value || null,
    to_warehouse_id: document.getElementById('reqTo').value,
    quantity: Number(document.getElementById('reqQty').value)
  };
  const res = await fetch('/api/stock-requests', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (res.ok) {
    showToast('Request submitted successfully', 'success');
    closeReqModal('newReqModal');
    loadRequests();
  } else {
    const d = await res.json();
    showToast(d.error || 'Failed to submit', 'error');
  }
});

function openActModal(id, action) {
  document.getElementById('actReqId').value = id;
  document.getElementById('actReqStatus').value = action;
  
  document.getElementById('actReasonGroup').classList.add('hidden');
  document.getElementById('actShipGroup').classList.add('hidden');
  ["actReason","actDriver","actTracking"].forEach(i=>document.getElementById(i).value='');
  
  if (action === 'rejected') {
    document.getElementById('actReqTitle').textContent = 'Reject Request';
    document.getElementById('actReasonGroup').classList.remove('hidden');
  } else if (action === 'shipped') {
    document.getElementById('actReqTitle').textContent = 'Ship Request';
    document.getElementById('actShipGroup').classList.remove('hidden');
  } else if (action === 'approved') {
    document.getElementById('actReqTitle').textContent = 'Approve Request';
  } else if (action === 'received') {
    document.getElementById('actReqTitle').textContent = 'Receive Stock';
  }
  
  document.getElementById('actReqModal').classList.remove('hidden');
}

document.getElementById('actReqForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('actReqId').value;
  const status = document.getElementById('actReqStatus').value;
  const payload = { status };
  
  if (status === 'rejected') payload.reason = document.getElementById('actReason').value;
  if (status === 'shipped') {
    payload.shipping_type = document.getElementById('actShipType').value;
    payload.driver_details = document.getElementById('actDriver').value;
    payload.tracking_number = document.getElementById('actTracking').value;
  }
  
  const res = await fetch(`/api/stock-requests/${id}/status`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (res.ok) {
    showToast(`Request ${status} successfully`, 'success');
    closeReqModal('actReqModal');
    loadRequests();
  } else {
    const d = await res.json();
    showToast(d.error || 'Failed to update', 'error');
  }
});

// ============================================================
// TRANSFER
// ============================================================

async function initTransfer() {
  // Populate item select
  const itemSel = document.getElementById('tf-item');
  const [itemsRes, whRes] = await Promise.all([fetch('/api/inventory'), fetch('/api/warehouses')]);
  const items = await itemsRes.json();
  const warehouses = await whRes.json();

  itemSel.innerHTML = '<option value="">— Select Product —</option>' +
    items.map(i => `<option value="${i.id}">${escapeHtml(i.name)} (${escapeHtml(i.sku)})</option>`).join('');

  const whOptions = warehouses.map(w => `<option value="${w.id}">${escapeHtml(w.name)} - ${escapeHtml(w.state||'')}</option>`).join('');
  document.getElementById('tf-from').innerHTML = '<option value="">— Select Source —</option>' + whOptions;
  document.getElementById('tf-to').innerHTML = '<option value="">— Select Destination —</option>' + whOptions;

  // Update available stock on item/warehouse change
  async function updateAvailable() {
    const iid = document.getElementById('tf-item').value;
    const wid = document.getElementById('tf-from').value;
    const el = document.getElementById('tf-available');
    if (iid && wid) {
      const res = await fetch('/api/all-stock');
      const stocks = await res.json();
      const entry = stocks.find(s => s.inventory_id == iid && s.warehouse_id == wid);
      el.textContent = entry ? `Available: ${entry.quantity} units` : 'Not stocked in this warehouse';
    } else {
      el.textContent = 'Select a product and source warehouse';
    }
  }
  document.getElementById('tf-item').addEventListener('change', updateAvailable);
  document.getElementById('tf-from').addEventListener('change', updateAvailable);

  // Load recent transfers
  loadTransferHistory();
}

async function loadTransferHistory() {
  const res = await fetch('/api/stock-history?change_type=move&limit=20');
  if (!res.ok) return;
  const rows = await res.json();
  const tbody = document.querySelector('#transferHistoryTable tbody');
  tbody.innerHTML = rows.length === 0
    ? '<tr><td colspan="8" class="empty-cell">No transfers yet</td></tr>'
    : rows.map(r => {
        const delta = r.new_quantity - r.old_quantity;
        const sign = delta >= 0 ? '+' : '';
        return `<tr>
          <td>${formatDate(r.changed_at)}</td>
          <td><strong>${escapeHtml(r.item_name)}</strong></td>
          <td>${escapeHtml(r.warehouse_name)}</td>
          <td class="text-right">${r.old_quantity}</td>
          <td class="text-right">${r.new_quantity}</td>
          <td class="text-right ${delta>=0?'delta-pos':'delta-neg'}">${sign}${delta}</td>
          <td>${escapeHtml(r.changed_by_name || '—')}</td>
          <td>${escapeHtml(r.notes || '—')}</td>
        </tr>`;
      }).join('');
}

document.getElementById('transferForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    inventory_id: document.getElementById('tf-item').value,
    from_warehouse_id: document.getElementById('tf-from').value,
    to_warehouse_id: document.getElementById('tf-to').value,
    quantity: Number(document.getElementById('tf-qty').value),
    notes: document.getElementById('tf-notes').value.trim()
  };
  const res = await fetch('/api/stock/transfer', {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) { showToast(data.error, 'error'); return; }
  showToast(data.message, 'success');
  document.getElementById('transferForm').reset();
  document.getElementById('tf-available').textContent = 'Select a product and source warehouse';
  loadTransferHistory();
});

// ============================================================
// ANALYTICS
// ============================================================

let statsChart;

async function loadAnalytics() {
  const wh = await fetch('/api/warehouses').then(r => r.json()).catch(() => []);
  const countries = Array.from(new Set(wh.map(w => w.country).filter(Boolean)));
  const cSel = document.getElementById('countrySelect');
  cSel.innerHTML = '<option value="">All Countries</option>' + countries.map(c => `<option value="${c}">${c}</option>`).join('');

  document.getElementById('statsMode').addEventListener('change', async function() {
    const show = this.value !== 'global';
    cSel.style.display = show ? '' : 'none';
    document.getElementById('stateSelect').style.display = this.value === 'state' ? '' : 'none';
    await refreshAnalytics(wh);
  });
  cSel.addEventListener('change', async () => {
    const country = cSel.value;
    const states = Array.from(new Set(wh.filter(w => !country || w.country===country).map(w => w.state).filter(Boolean)));
    const sSel = document.getElementById('stateSelect');
    sSel.innerHTML = '<option value="">All States</option>' + states.map(s => `<option value="${s}">${s}</option>`).join('');
    await refreshAnalytics(wh);
  });
  document.getElementById('stateSelect').addEventListener('change', () => refreshAnalytics(wh));
  await refreshAnalytics(wh);
  await loadRegionalTable();
}

async function refreshAnalytics(wh) {
  const mode = document.getElementById('statsMode').value;
  let data, labels, values, bg;
  const palette = ['#6366f1','#22d3ee','#10b981','#f59e0b','#ef4444','#a855f7','#f97316','#14b8a6'];

  if (mode === 'country') {
    const rows = await fetch('/api/stats/countries').then(r => r.json());
    labels = rows.map(r => r.country || 'Unknown');
    values = rows.map(r => Number(r.total_units));
    bg = labels.map((_,i) => palette[i%palette.length]);
  } else if (mode === 'state') {
    const country = document.getElementById('countrySelect').value;
    const url = country ? `/api/stats/states?country=${encodeURIComponent(country)}` : '/api/stats/states';
    const rows = await fetch(url).then(r => r.json());
    labels = rows.map(r => r.state ? `${r.state} (${r.country||''})` : 'Unknown');
    values = rows.map(r => Number(r.total_units));
    bg = labels.map((_,i) => palette[i%palette.length]);
  } else {
    const items = await fetch('/api/inventory').then(r => r.json());
    const total = items.reduce((s,i) => s+(i.total_quantity||0), 0);
    const low = items.filter(i => i.total_quantity>0 && i.total_quantity<i.reorder_level).length;
    const out = items.filter(i => i.total_quantity===0).length;
    labels = ['In Stock', 'Low Stock', 'Out of Stock'];
    values = [total - low, low, out];
    bg = ['#10b981', '#f59e0b', '#ef4444'];
  }

  const ctx = document.getElementById('statsChart');
  if (statsChart) { statsChart.destroy(); statsChart = null; }
  statsChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Units', data: values, backgroundColor: bg, borderRadius: 6 }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { color: '#a0aec0' } }, x: { ticks: { color: '#a0aec0' } } }
    }
  });
}

async function loadRegionalTable() {
  const res = await fetch('/api/locations/stats/regional');
  if (!res.ok) return;
  const rows = await res.json();
  const tbody = document.querySelector('#regionalTable tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.region || '—')}</strong></td>
      <td>${escapeHtml(r.country || '—')}</td>
      <td>${r.warehouse_count}</td>
      <td>${r.distinct_items}</td>
      <td class="text-right">${formatNumber(r.total_stock)}</td>
      <td class="text-right">${formatCurrency(r.total_value)}</td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="empty-cell">No data</td></tr>';
}

// ============================================================
// LOCATIONS
// ============================================================

async function loadLocations() {
  try {
    const res = await fetch('/api/locations');
    if (!res.ok) throw new Error();
    const locs = await res.json();
    renderLocations(locs);
  } catch {
    document.getElementById('locationsGrid').innerHTML = '<p class="empty-cell">Failed to load locations</p>';
  }
}

function renderLocations(locs) {
  const grid = document.getElementById('locationsGrid');
  if (!locs || locs.length === 0) {
    grid.innerHTML = '<p class="empty-cell">No warehouses configured yet.</p>';
    return;
  }
  grid.innerHTML = locs.map(loc => `
    <div class="location-card" onclick="showLocationDetails(${loc.id})">
      <div class="loc-card-header">
        <div class="loc-state">${escapeHtml(loc.state || loc.warehouse_name)}</div>
        <div class="loc-country">${escapeHtml(loc.country || '—')}</div>
      </div>
      <div class="loc-name">${escapeHtml(loc.warehouse_name)}</div>
      <div class="loc-manager">👤 ${escapeHtml(loc.manager_name || 'Unassigned')}</div>
      ${loc.low_stock_alerts > 0 ? `<div class="loc-alert">⚠️ ${loc.low_stock_alerts} low stock</div>` : ''}
      <div class="loc-meta-grid">
        <div class="loc-meta-item"><div class="loc-meta-val">${formatNumber(loc.total_stock)}</div><div class="loc-meta-lbl">Units</div></div>
        <div class="loc-meta-item"><div class="loc-meta-val">${loc.distinct_items}</div><div class="loc-meta-lbl">Items</div></div>
        <div class="loc-meta-item"><div class="loc-meta-val">${loc.team_size}</div><div class="loc-meta-lbl">Team</div></div>
        <div class="loc-meta-item"><div class="loc-meta-val">${formatCurrency(loc.stock_value)}</div><div class="loc-meta-lbl">Value</div></div>
      </div>
    </div>
  `).join('');
}

async function showLocationDetails(locationId) {
  try {
    const res = await fetch(`/api/locations/${locationId}`);
    if (!res.ok) throw new Error();
    const d = await res.json();

    document.getElementById('locationTitle').textContent = `${d.warehouse.warehouse_name || d.warehouse.name}`;
    document.getElementById('locationName').textContent = d.warehouse.name;
    document.getElementById('locationState').textContent = d.warehouse.state || '—';
    document.getElementById('locationCountry').textContent = d.warehouse.country || '—';
    document.getElementById('locationCapacity').textContent = `${formatNumber(d.warehouse.capacity)} units`;
    document.getElementById('locationManager').textContent = d.warehouse.manager_name || 'Unassigned';
    document.getElementById('locationTeamSize').textContent = d.team.length;
    document.getElementById('locationStockCount').textContent = formatNumber(d.stats?.total_units || 0);
    document.getElementById('locationValueStat').textContent = formatCurrency(d.stats?.total_value || 0);
    document.getElementById('locationOutOfStock').textContent = d.stats?.out_of_stock_items || 0;
    document.getElementById('locationLowStock').textContent = d.stats?.low_stock_items || 0;

    const teamEl = document.getElementById('locationTeamList');
    teamEl.innerHTML = d.team.length > 0
      ? d.team.map(m => `
          <div class="team-card">
            <div class="team-avatar">${m.fullname[0]}</div>
            <div>
              <strong>${escapeHtml(m.fullname)}</strong>
              <div class="team-sub">${escapeHtml(m.username)} · ${escapeHtml(m.email)}</div>
              ${m.last_login ? `<div class="team-sub">Last login: ${formatDate(m.last_login)}</div>` : ''}
            </div>
          </div>`).join('')
      : '<p class="empty-cell">No team members assigned</p>';

    const invTbody = document.getElementById('locationInventoryList');
    invTbody.innerHTML = d.stock.map(item => {
      const qty = item.quantity || 0;
      const statusBadge = qty === 0
        ? '<span class="badge badge-danger">Out</span>'
        : qty < item.reorder_level ? '<span class="badge badge-warning">Low</span>'
          : '<span class="badge badge-success">OK</span>';
      return `
        <tr>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td><code>${escapeHtml(item.sku)}</code></td>
          <td><span class="cat-badge">${escapeHtml(item.category || '—')}</span></td>
          <td class="text-right">${formatNumber(qty)}</td>
          <td class="text-right">₹${Number(item.unit_price||0).toLocaleString('en-IN')}</td>
          <td class="text-right">${formatCurrency(item.item_value)}</td>
          <td>${statusBadge}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="7" class="empty-cell">No inventory</td></tr>';

    document.getElementById('locationModal').classList.remove('hidden');
  } catch {
    showToast('Failed to load location details', 'error');
  }
}

function closeLocationModal() {
  const mod = document.getElementById('locationModal');
  if (mod) mod.classList.add('hidden');
}

// ============================================================
// WAREHOUSES
// ============================================================

let warehouses = [];

async function loadWarehouses() {
  const res = await fetch('/api/warehouses');
  if (!res.ok) return;
  warehouses = await res.json();
  const tbody = document.querySelector('#warehousesTable tbody');
  tbody.innerHTML = warehouses.map(w => `
    <tr>
      <td><strong>${escapeHtml(w.name)}</strong></td>
      <td>${escapeHtml(w.store || '—')}</td>
      <td>${escapeHtml(w.state || '—')}</td>
      <td>${escapeHtml(w.country || '—')}</td>
      <td class="text-right">${formatNumber(w.capacity)}</td>
      <td>${escapeHtml(w.manager_name || 'Unassigned')}</td>
      <td class="text-right">${formatNumber(w.total_stock)}</td>
      <td class="text-right">${w.item_count}</td>
      <td class="actions">
        <button data-id="${w.id}" class="btn btn-sm btn-edit wh-edit">✏️</button>
        <button data-id="${w.id}" class="btn btn-sm btn-danger wh-delete">🗑️</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="9" class="empty-cell">No warehouses</td></tr>';

  // Load managers for dropdown
  const managerRes = await fetch('/api/users/managers');
  if (managerRes.ok) {
    const managers = await managerRes.json();
    const sel = document.getElementById('w-manager');
    if (sel) sel.innerHTML = '<option value="">— No Manager —</option>' +
      managers.map(m => `<option value="${m.id}">${escapeHtml(m.fullname)}</option>`).join('');
  }
}

document.getElementById('warehouseForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('warehouseId').value;
  const payload = {
    name: document.getElementById('w-name').value.trim(),
    store: document.getElementById('w-store').value.trim(),
    location: document.getElementById('w-location').value.trim(),
    state: document.getElementById('w-state').value.trim(),
    country: document.getElementById('w-country').value.trim(),
    capacity: Number(document.getElementById('w-capacity').value || 0),
    manager_id: document.getElementById('w-manager')?.value || null,
    description: document.getElementById('w-description').value.trim()
  };
  const res = await fetch(id ? `/api/warehouses/${id}` : '/api/warehouses', {
    method: id ? 'PUT' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) { showToast(data.error, 'error'); return; }
  showToast(id ? 'Warehouse updated!' : 'Warehouse created!', 'success');
  resetWarehouseForm();
  loadWarehouses();
});

document.getElementById('w-resetBtn')?.addEventListener('click', resetWarehouseForm);
function resetWarehouseForm() {
  document.getElementById('warehouseId').value = '';
  document.getElementById('whFormTitle').textContent = '➕ Add Warehouse';
  ['w-name','w-store','w-location','w-state','w-country','w-description'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('w-capacity').value = '10000';
  const mgSel = document.getElementById('w-manager'); if(mgSel) mgSel.value = '';
}

document.getElementById('warehousesTable')?.addEventListener('click', async e => {
  const btn = e.target.closest('button'); if (!btn) return;
  const id = btn.dataset.id;
  if (btn.classList.contains('wh-delete')) {
    const ok = await showConfirm('Delete Warehouse', 'This will deactivate the warehouse. Only possible if it has no active stock.');
    if (!ok) return;
    const res = await fetch(`/api/warehouses/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) { showToast(d.error, 'error'); return; }
    showToast('Warehouse deactivated', 'success'); loadWarehouses();
  }
  if (btn.classList.contains('wh-edit')) {
    const w = warehouses.find(x => x.id == id);
    if (w) {
      document.getElementById('warehouseId').value = w.id;
      document.getElementById('w-name').value = w.name;
      document.getElementById('w-store').value = w.store || '';
      document.getElementById('w-location').value = w.location || '';
      document.getElementById('w-state').value = w.state || '';
      document.getElementById('w-country').value = w.country || '';
      document.getElementById('w-capacity').value = w.capacity || 10000;
      const mgSel = document.getElementById('w-manager'); if(mgSel) mgSel.value = w.manager_id || '';
      document.getElementById('w-description').value = w.description || '';
      document.getElementById('whFormTitle').textContent = '✏️ Edit Warehouse';
      document.querySelector('#warehouses .glass-card').scrollIntoView({ behavior: 'smooth' });
    }
  }
});

// ============================================================
// USERS
// ============================================================

let users = [];

async function loadUsers() {
  const res = await fetch('/api/users');
  if (!res.ok) { if (res.status === 401) window.location.href='/login.html'; return; }
  users = await res.json();

  // Populate warehouse grid
  const whRes = await fetch('/api/warehouses');
  if (whRes.ok) {
    const whs = await whRes.json();
    const grid = document.getElementById('u-warehouse-grid');
    if (grid) {
      grid.innerHTML = whs.map(w => `
        <label class="checkbox-item">
          <input type="checkbox" name="u-warehouse-cb" value="${w.id}">
          <span>${escapeHtml(w.name)}</span>
        </label>
      `).join('') || '<p class="empty-cell" style="grid-column:1/-1">No warehouses available</p>';
      
      // Enforce single selection for non-managers
      grid.onchange = e => {
        const role = document.getElementById('u-role').value;
        if (role !== 'manager' && e.target.checked) {
          document.querySelectorAll('input[name="u-warehouse-cb"]').forEach(cb => {
            if (cb !== e.target) cb.checked = false;
          });
        }
      };
    }
    // Still keep a hidden select for compatibility or primary warehouse
    const sel = document.getElementById('u-warehouse');
    if (sel) sel.innerHTML = '<option value="">— No Warehouse —</option>' +
      whs.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');
  }

  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <strong>${escapeHtml(u.fullname)}</strong><br>
        <small class="text-muted">${escapeHtml(u.designation || 'Staff')}</small>
      </td>
      <td><span class="badge badge-light">${escapeHtml(u.department || 'General')}</span></td>
      <td><code>${escapeHtml(u.username)}</code></td>
      <td>
        <span class="pwd-mask">••••••••</span>
        <span class="pwd-real hidden">${escapeHtml(u.password||'—')}</span>
        <button class="btn-icon toggle-pwd" title="Toggle Visibility" style="background:transparent;border:none;cursor:pointer;font-size:1.1rem;margin-left:5px;">👁️</button>
      </td>
      <td>${u.join_date ? new Date(u.join_date).toLocaleDateString('en-IN') : '—'}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.phone || '—')}</td>
      <td>${escapeHtml(u.manager_name || '—')}</td>
      <td>${escapeHtml(u.warehouse_name || '—')}</td>
      <td><span class="role-pill role-${u.role}">${escapeHtml(u.role)}</span></td>
      <td><span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>${formatDate(u.last_login)}</td>
      <td class="actions">
        <button data-id="${u.id}" class="btn btn-sm btn-edit u-edit" title="Edit">✏️</button>
        <button data-id="${u.id}" class="btn btn-sm btn-info u-history" title="History">⏳</button>
        ${u.is_active 
          ? `<button data-id="${u.id}" class="btn btn-sm btn-danger u-delete" title="Deactivate">🚫</button>` 
          : `<button data-id="${u.id}" class="btn btn-sm btn-success u-activate" title="Reactivate">✅</button>`}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="10" class="empty-cell">No users</td></tr>';
}

document.getElementById('userForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('userId').value;
  const payload = {
    fullname: document.getElementById('u-fullname').value.trim(),
    username: document.getElementById('u-username').value.trim(),
    email: document.getElementById('u-email').value.trim(),
    phone: document.getElementById('u-phone').value.trim(),
    password: document.getElementById('u-password').value.trim(),
    role: document.getElementById('u-role').value,
    join_date: document.getElementById('u-join-date').value || null,
    designation: document.getElementById('u-designation').value.trim() || null,
    department: document.getElementById('u-department').value.trim() || null
  };
  const cbs = Array.from(document.querySelectorAll('input[name="u-warehouse-cb"]:checked'));
  const role = document.getElementById('u-role').value;
  if (role === 'manager') {
    payload.warehouse_id = cbs.map(cb => cb.value);
  } else {
    payload.warehouse_id = cbs[0]?.value || null;
  }
  const url = id ? `/api/users/${id}` : '/api/register';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) { showToast(data.error, 'error'); return; }
  showToast(id ? 'User updated!' : 'User created!', 'success');
  resetUserForm(); loadUsers();
});

document.getElementById('u-resetBtn')?.addEventListener('click', resetUserForm);
function resetUserForm() {
  document.getElementById('userId').value = '';
  document.getElementById('userFormTitle').textContent = '➕ Add Team Member';
  ['u-fullname','u-username','u-email','u-phone','u-password','u-warehouse','u-join-date','u-designation','u-department'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.querySelectorAll('input[name="u-warehouse-cb"]').forEach(cb => cb.checked = false);
  document.getElementById('u-role').value = 'user';
  toggleRoleField();
}

function toggleRoleField() {
  const rg = document.getElementById('roleGroup');
  const wg = document.getElementById('warehouseGroup');
  const role = document.getElementById('u-role')?.value || 'user';
  if (rg) rg.style.display = window.currentRole === 'manager' ? 'none' : '';
  
  if (wg) {
    wg.style.display = '';
  }
}
document.getElementById('u-role')?.addEventListener('change', toggleRoleField);

document.getElementById('usersTable')?.addEventListener('click', async e => {
  const btn = e.target.closest('button'); if (!btn) return;
  const id = btn.dataset.id;
  if (btn.classList.contains('u-delete')) {
    const ok = await showConfirm('Deactivate User', 'This user will be deactivated and cannot login. Their data is preserved.');
    if (!ok) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) { showToast(d.error, 'error'); return; }
    showToast('User deactivated', 'success'); loadUsers();
  }
  if (btn.classList.contains('u-activate')) {
    const ok = await showConfirm('Reactivate User', 'This user will be reactivated and can login again.');
    if (!ok) return;
    const res = await fetch(`/api/users/${id}/activate`, { method: 'PUT' });
    const d = await res.json();
    if (!res.ok) { showToast(d.error, 'error'); return; }
    showToast('User reactivated', 'success'); loadUsers();
  }
  if (btn.classList.contains('toggle-pwd')) {
    const td = btn.closest('td');
    const mask = td.querySelector('.pwd-mask');
    const real = td.querySelector('.pwd-real');
    if (mask.classList.contains('hidden')) {
      mask.classList.remove('hidden'); real.classList.add('hidden');
    } else {
      mask.classList.add('hidden'); real.classList.remove('hidden');
    }
  }
  if (btn.classList.contains('u-edit')) {
    const u = users.find(x => x.id == id);
    if (u) {
      document.getElementById('userId').value = u.id;
      document.getElementById('u-fullname').value = u.fullname;
      document.getElementById('u-username').value = u.username;
      document.getElementById('u-email').value = u.email;
      document.getElementById('u-phone').value = u.phone || '';
      document.getElementById('u-password').value = u.password || '';
      document.getElementById('u-join-date').value = u.join_date ? u.join_date.split('T')[0] : '';
      document.getElementById('u-designation').value = u.designation || '';
      document.getElementById('u-department').value = u.department || '';
      document.getElementById('u-role').value = u.role;
      toggleRoleField();
      if (u.role === 'manager' && u.managed_warehouse_ids) {
        const wIds = typeof u.managed_warehouse_ids === 'string' ? JSON.parse(u.managed_warehouse_ids) : u.managed_warehouse_ids;
        document.querySelectorAll('input[name="u-warehouse-cb"]').forEach(cb => {
          cb.checked = wIds.includes(Number(cb.value)) || wIds.includes(cb.value);
        });
      } else {
        const targetId = String(u.warehouse_id || '');
        document.querySelectorAll('input[name="u-warehouse-cb"]').forEach(cb => {
          cb.checked = (cb.value === targetId);
        });
      }
      document.getElementById('userFormTitle').textContent = '✏️ Edit User';
      toggleRoleField();
      document.querySelector('#users .glass-card').scrollIntoView({ behavior: 'smooth' });
    }
  }
  if (btn.classList.contains('u-history')) {
    openUserHistory(id);
  }
});

async function openUserHistory(userId) {
  const modal = document.getElementById('userHistoryModal');
  const tbody = document.querySelector('#historyTable tbody');
  tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
  modal.classList.remove('hidden');
  
  try {
    const res = await fetch(`/api/users/${userId}/experience`);
    if (!res.ok) throw new Error('Failed to fetch history');
    const logs = await res.json();
    
    // Fetch managers for names
    const mRes = await fetch('/api/users/managers');
    const mgrs = mRes.ok ? await mRes.json() : []; // Corrected typo from rRes to mRes
    
    tbody.innerHTML = logs.map(h => {
      let whNames = '—';
      try {
        const ids = JSON.parse(h.warehouse_ids || '[]');
        whNames = Array.isArray(ids) ? ids.join(', ') : ids;
      } catch(e) {}
      
      return `
        <tr>
          <td>${formatDate(h.changed_at)}</td>
          <td>Manager ID: ${h.manager_id || 'None'}</td>
          <td>${whNames}</td>
          <td>${escapeHtml(h.changed_by_name || 'System')}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="4">No assignment history found</td></tr>';
    
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-danger">${e.message}</td></tr>`;
  }
}

// ============================================================
// AUDIT LOG
// ============================================================

let auditPage = 0;
const AUDIT_PAGE_SIZE = 50;
let allAudit = [];

async function loadAudit(page = 0) {
  auditPage = page;
  setLoading('auditTable', 10);
  const params = new URLSearchParams({ limit: AUDIT_PAGE_SIZE, offset: page * AUDIT_PAGE_SIZE });
  const ct = document.getElementById('auditChangeType')?.value;
  if (ct) params.set('change_type', ct);
  const res = await fetch('/api/stock-history?' + params.toString());
  if (!res.ok) return;
  allAudit = await res.json();
  renderAudit(allAudit);
}

document.getElementById('auditChangeType')?.addEventListener('change', () => loadAudit(0));
document.getElementById('auditSearch')?.addEventListener('input', () => {
  const q = document.getElementById('auditSearch').value.toLowerCase();
  const filtered = allAudit.filter(r =>
    r.item_name.toLowerCase().includes(q) || r.warehouse_name.toLowerCase().includes(q) || (r.sku||'').toLowerCase().includes(q)
  );
  renderAudit(filtered);
});

function renderAudit(rows) {
  const tbody = document.querySelector('#auditTable tbody');
  const empty = document.getElementById('auditEmpty');
  if (rows.length === 0) {
    tbody.innerHTML = '';
    empty?.classList.remove('hidden'); return;
  }
  empty?.classList.add('hidden');
  const typeColors = { add:'badge-success', remove:'badge-danger', adjust:'badge-info', move:'badge-purple', initial:'badge-muted' };
  tbody.innerHTML = rows.map(r => {
    const delta = r.new_quantity - r.old_quantity;
    const sign = delta >= 0 ? '+' : '';
    const cls = delta > 0 ? 'delta-pos' : delta < 0 ? 'delta-neg' : 'delta-zero';
    return `
      <tr>
        <td class="text-sm">${formatDate(r.changed_at)}</td>
        <td><span class="badge ${typeColors[r.change_type]||'badge-muted'}">${r.change_type}</span></td>
        <td><strong>${escapeHtml(r.item_name)}</strong><br><code class="text-xs">${escapeHtml(r.sku)}</code></td>
        <td>${escapeHtml(r.warehouse_name)}</td>
        <td>${escapeHtml(r.state||'—')} / ${escapeHtml(r.country||'—')}</td>
        <td class="text-right">${r.old_quantity}</td>
        <td class="text-right">${r.new_quantity}</td>
        <td class="text-right"><strong class="${cls}">${sign}${delta}</strong></td>
        <td>${escapeHtml(r.changed_by_name || '—')}</td>
        <td class="text-sm">${escapeHtml(r.notes || '—')}</td>
      </tr>`;
  }).join('');
}

// ============================================================
// REPORTS
// ============================================================

document.querySelectorAll('.report-tab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    const type = this.dataset.report;
    document.querySelectorAll('[id^="report-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`report-${type}`)?.classList.remove('hidden');
    loadReport(type);
  });
});

async function loadReport(type) {
  if (type === 'low-stock') {
    const res = await fetch('/api/reports/low-stock');
    if (!res.ok) return;
    const rows = await res.json();
    const tbody = document.querySelector('#reportLowStockTable tbody');
    const empty = document.getElementById('reportLowEmpty');
    if (rows.length === 0) {
      tbody.innerHTML = '';
      empty?.classList.remove('hidden'); return;
    }
    empty?.classList.add('hidden');
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td><strong>${escapeHtml(r.name)}</strong></td>
        <td><code>${escapeHtml(r.sku)}</code></td>
        <td><span class="cat-badge">${escapeHtml(r.category || '—')}</span></td>
        <td>${escapeHtml(r.supplier || '—')}</td>
        <td class="text-right"><span class="badge ${r.total_quantity===0?'badge-danger':'badge-warning'}">${formatNumber(r.total_quantity)}</span></td>
        <td class="text-right">${r.reorder_level}</td>
        <td class="text-right text-danger"><strong>${formatNumber(r.shortage)}</strong></td>
        <td class="text-right">₹${Number(r.unit_price||0).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');
  } else if (type === 'valuation') {
    const res = await fetch('/api/reports/valuation');
    if (!res.ok) return;
    const d = await res.json();
    document.getElementById('valuationSummary').innerHTML = `
      <div class="val-kpi"><div class="val-num">${formatCurrency(d.grand_total)}</div><div class="val-lbl">Grand Total Value</div></div>
      <div class="val-kpi"><div class="val-num">${d.items.length}</div><div class="val-lbl">Products</div></div>
    `;
    const tbody = document.querySelector('#reportValTable tbody');
    tbody.innerHTML = d.items.map(r => {
      const pct = d.grand_total > 0 ? ((r.total_value / d.grand_total) * 100).toFixed(1) : '0.0';
      return `
        <tr>
          <td><strong>${escapeHtml(r.name)}</strong></td>
          <td><code>${escapeHtml(r.sku)}</code></td>
          <td><span class="cat-badge">${escapeHtml(r.category || '—')}</span></td>
          <td class="text-right">₹${Number(r.unit_price||0).toLocaleString('en-IN')}</td>
          <td class="text-right">${formatNumber(r.total_qty)}</td>
          <td class="text-right"><strong>${formatCurrency(r.total_value)}</strong></td>
          <td class="text-right">${pct}%</td>
        </tr>`;
    }).join('');
  }
}

// ============================================================
// LOGOUT
// ============================================================

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  const ok = await showConfirm('Logout', 'Are you sure you want to logout?');
  if (!ok) return;
  const res = await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

// ============================================================
// REAL-TIME ALERTS (SSE)
// ============================================================

function initRealtimeAlerts() {
  const evtSource = new EventSource('/api/events');
  evtSource.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'low_stock') {
        showToast(data.message, 'warning');
      } else {
        showToast(`📦 ${data.message}`, 'info');
      }
      
      // Optionally refresh the current view if relevant
      const hash = window.location.hash;
      if (hash === '#dashboard' || hash === '') loadDashboard();
      if (hash === '#items') loadItems();
      if (hash === '#stock') loadStockTable();
      if (hash === '#requests') loadRequests();
      if (hash === '#stats') { loadAnalytics(); loadReport('low-stock'); }
      if (hash === '#locations') { loadLocations(); loadWarehouses(); }
      if (hash === '#users') loadUsers();
      if (hash === '#audit') loadAudit(auditPage);
    } catch(e) {}
  };
}

// ============================================================
// INIT
// ============================================================

startClock();
showSection('dashboard');
checkAuth();
