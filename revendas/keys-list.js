let _selectedKey = '';
let _allKeyItems = [];

let _listLoaded = false;
let _listDirty = true;
let _listLoadedAt = 0;
let _listRevision = 0;
let _listRequest = null;
let _visibleKeyCount = 0;
const LIST_MAX_AGE_MS = 60 * 1000;
const MOBILE_KEY_BATCH = 20;
const DESKTOP_KEY_BATCH = 50;
const mobileKeysMedia = window.matchMedia('(max-width: 767px)');

function isListVisible() {
  return !document.getElementById('appShell').classList.contains('hidden') &&
    !document.getElementById('panel-list').classList.contains('hidden');
}

function invalidateList() {
  invalidateInsights();
  markFinanceDirty();
  _listDirty = true;
  _listRevision++;
  if (isListVisible()) doList(false);
}

function resetListState() {
  _listRevision++;
  _listLoaded = false;
  _listDirty = true;
  _listLoadedAt = 0;
  _allKeyItems = [];
  _selectedKey = '';
  _visibleKeyCount = 0;
  applyFilters();
}

async function doList(force = true) {
  if (_listRequest) return _listRequest;
  if (!force && _listLoaded && !_listDirty && Date.now() - _listLoadedAt < LIST_MAX_AGE_MS) return;

  const revision = _listRevision;
  const tokenAtStart = document.getElementById('token').value;
  setLoading('btnList', true);
  _listRequest = (async () => {
    try {
      const d = await api('/admin/auth-keys/list', {});
      if (tokenAtStart !== document.getElementById('token').value || revision !== _listRevision) return;
      _allKeyItems = sortKeys(d?.Result || d?.result || []);
      _selectedKey = '';
      _listLoaded = true;
      _listLoadedAt = Date.now();
      _listDirty = revision !== _listRevision;
      applyFilters();
    } catch (e) {
      if (tokenAtStart === document.getElementById('token').value && revision === _listRevision) {
        toast('Erro: ' + e.message, true);
      }
    } finally {
      setLoading('btnList', false);
      _listRequest = null;
      if (revision !== _listRevision && isListVisible()) doList(false);
    }
  })();
  return _listRequest;
}

function getStatusKey(i) {
  const ok = Boolean(i.is_active ?? i.IsActive);
  const paused = Boolean(i.is_paused ?? i.IsPaused);
  const endDate = parseUtcDate(i.ends_at ?? i.EndsAt);
  const isExpired = endDate && endDate < new Date();
  if (paused) return 'congelada';
  if (ok) return isExpired ? 'expirado' : 'ativa';
  const activatedDate = parseUtcDate(i.activated_at ?? i.ActivatedAt);
  return activatedDate && endDate ? 'revogada' : 'inativa';
}

function sortKeys(items) {
  const statusOrder = { ativa: 0, congelada: 1, inativa: 2, revogada: 3, expirado: 4 };
  return items.map((item, index) => ({ item, index })).sort((a, b) => {
    const aStatus = getStatusKey(a.item);
    const bStatus = getStatusKey(b.item);
    if (aStatus !== bStatus) return statusOrder[aStatus] - statusOrder[bStatus];

    const aEnd = parseUtcDate(a.item.ends_at ?? a.item.EndsAt);
    const bEnd = parseUtcDate(b.item.ends_at ?? b.item.EndsAt);
    if (aStatus !== 'inativa') {
      if (aEnd && !bEnd) return -1;
      if (!aEnd && bEnd) return 1;
      if (aEnd && bEnd) {
        const endOrder = aStatus === 'expirado' ? bEnd - aEnd : aEnd - bEnd;
        if (endOrder) return endOrder;
      }
    }

    const aCreated = parseUtcDate(a.item.created_at ?? a.item.CreatedAt);
    const bCreated = parseUtcDate(b.item.created_at ?? b.item.CreatedAt);
    if (aCreated && !bCreated) return -1;
    if (!aCreated && bCreated) return 1;
    if (aCreated && bCreated) return bCreated - aCreated || a.index - b.index;
    return a.index - b.index;
  }).map(({ item }) => item);
}

function keyBatchSize() {
  return mobileKeysMedia.matches ? MOBILE_KEY_BATCH : DESKTOP_KEY_BATCH;
}

function loadMoreKeys() {
  _visibleKeyCount += keyBatchSize();
  applyFilters(false);
}

function applyFilters(resetLimit = true) {
  const q = (document.getElementById('filterSearch').value || '').trim().toLowerCase();
  const statusFilter = document.getElementById('filterStatus').value;
  const productFilter = document.getElementById('filterProduct').value;
  const durationFilter = document.getElementById('filterDuration').value;

  const filtered = _allKeyItems.filter(i => {
    if (statusFilter && getStatusKey(i) !== statusFilter) return false;
    if (durationFilter && Number(i.duration_days ?? i.DurationDays) !== Number(durationFilter)) return false;
    if (productFilter) {
      const pt = i.product_type ?? i.ProductType;
      const ptCode = resolveProductCode(pt) || 'PB';
      if (ptCode !== productFilter) return false;
    }
    if (q) {
      const k = (i.key_value || i.KeyValue || '').toLowerCase();
      const hwid = (i.hwid || i.Hwid || '').toLowerCase();
      if (!k.includes(q) && !hwid.includes(q)) return false;
    }
    return true;
  });

  if (resetLimit) _selectedKey = '';
  if (resetLimit || !_visibleKeyCount) _visibleKeyCount = keyBatchSize();
  const visible = filtered.slice(0, _visibleKeyCount);
  renderTable(visible);

  const countEl = document.getElementById('filterCount');
  if (countEl) {
    const total = _allKeyItems.length;
    countEl.textContent = total
      ? (filtered.length === total
        ? `${visible.length} de ${total} exibidas`
        : `${visible.length} de ${filtered.length} filtradas · ${total} no total`)
      : '';
  }

  const btnLoadMore = document.getElementById('btnLoadMore');
  const remaining = filtered.length - visible.length;
  btnLoadMore.classList.toggle('hidden', remaining <= 0);
  if (remaining > 0) btnLoadMore.textContent = `Carregar mais ${Math.min(keyBatchSize(), remaining)} chaves`;
}

function clearFilters() {
  document.getElementById('filterSearch').value = '';
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterProduct').value = '';
  document.getElementById('filterDuration').value = '';
  applyFilters();
}

function statusPill(kind, label) {
  const styles = {
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    error: 'bg-error/15 text-error',
    neutral: 'bg-base-content/10 text-base-content/50',
  };
  return `<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles[kind]}">
    <span class="w-1.5 h-1.5 rounded-full ${kind === 'neutral' ? 'bg-base-content/40' : 'bg-current'}"></span>${label}
  </span>`;
}

const keyContextMenu = document.getElementById('keyContextMenu');
const keyContextHwid = document.getElementById('keyContextHwid');
const keyContextFrozenBy = document.getElementById('keyContextFrozenBy');
const keyContextLastUsedAt = document.getElementById('keyContextLastUsedAt');

function showKeyContextMenu(event, item) {
  if (mobileKeysMedia.matches || typeof keyContextMenu.showPopover !== 'function') return;
  event.preventDefault();

  const hwid = item.hwid || item.Hwid || '';
  keyContextHwid.textContent = hwid || '—';
  keyContextHwid.title = hwid;

  const paused = Boolean(item.is_paused ?? item.IsPaused);
  const frozenBy = item.frozen_by || item.FrozenBy;
  keyContextFrozenBy.textContent = paused ? (frozenBy === 'batch' ? 'Lote' : 'Manual') : '—';

  if (keyContextLastUsedAt) {
    keyContextLastUsedAt.textContent = fmtDate(item.last_used_at ?? item.LastUsedAt);
  }

  if (!keyContextMenu.matches(':popover-open')) keyContextMenu.showPopover();
  const margin = 8;
  const { offsetWidth, offsetHeight } = keyContextMenu;
  const viewport = document.documentElement;
  keyContextMenu.style.left = Math.max(margin, Math.min(event.clientX, viewport.clientWidth - offsetWidth - margin)) + 'px';
  keyContextMenu.style.top = Math.max(margin, Math.min(event.clientY, viewport.clientHeight - offsetHeight - margin)) + 'px';
}

function renderTable(items) {
  if (keyContextMenu.matches(':popover-open')) keyContextMenu.hidePopover();
  const body = document.getElementById('keysBody');
  if (!Array.isArray(items) || !items.length) {
    body.innerHTML = `<tr><td colspan="7" class="py-14">
      <div class="flex flex-col items-center gap-2.5 text-base-content/40">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <span class="text-xs">Nenhuma key encontrada.</span>
      </div>
    </td></tr>`;
    return;
  }
  body.innerHTML = items.map(i => {
    const k = i.key_value || i.KeyValue || '';
    const safeKey = k.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const status = getStatusKey(i);
    const days = i.duration_days ?? i.DurationDays ?? '—';
    const act = fmtDate(i.activated_at ?? i.ActivatedAt);
    const end = fmtDate(i.ends_at ?? i.EndsAt);
    const pt = i.product_type ?? i.ProductType;
    const ptCode = resolveProductCode(pt) || 'PB';
    const productName = pt !== null && pt !== undefined ? productLabel(ptCode) : '—';

    let statusHtml = '';
    let actionBtn = '';
    const freezeBtnClass = 'btn btn-xs rounded-full px-3 font-semibold btn-outline btn-warning border-warning/40 hover:border-warning';
    const resumeBtnClass = 'btn btn-xs rounded-full px-3 font-semibold btn-outline btn-success border-success/40 hover:border-success';
    if (status === 'congelada') {
      statusHtml = statusPill('warning', 'Congelada');
      actionBtn = `<button class="${resumeBtnClass}" data-freeze="false">Retomar</button>`;
    } else if (status === 'ativa' || status === 'expirado') {
      if (status === 'expirado') {
        statusHtml = statusPill('error', 'Expirado');
      } else {
        statusHtml = statusPill('success', 'Ativa');
      }
      actionBtn = `<button class="${freezeBtnClass}" data-freeze="true">Congelar</button>`;
    } else if (status === 'revogada') {
      statusHtml = statusPill('error', 'Revogada');
    } else {
      statusHtml = statusPill('neutral', 'Inativa');
    }

    return `<tr data-key="${safeKey}" data-product="${ptCode}" class="key-row group hover:bg-brand/[0.04] cursor-pointer transition-colors">
      <td data-label="Key" class="py-3 pl-5">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5 shrink-0 text-base-content/25 group-hover:text-brand transition-colors">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
          </svg>
          <span class="mono text-[11.5px] tracking-[0.02em] truncate max-w-[170px] group-hover:text-brand transition-colors" title="${safeKey}">${safeKey}</span>
        </div>
      </td>
      <td data-label="Status">${statusHtml}</td>
      <td data-label="Produto" class="text-sm font-medium">${productName}</td>
      <td data-label="Dias" class="mobile-extra text-center mono text-xs text-base-content/70">${days}</td>
      <td data-label="Ativada em" class="mobile-extra text-xs text-base-content/60">${act}</td>
      <td data-label="Termina em" class="mobile-extra text-xs text-base-content/60">${end}</td>
      <td data-label="Ação" class="text-right pr-5">${actionBtn}</td>
    </tr>`;
  }).join('');

  const rows = body.querySelectorAll('tr[data-key]');
  rows.forEach((row, index) => {
    row.addEventListener('contextmenu', event => showKeyContextMenu(event, items[index]));
    if (row.getAttribute('data-key') === _selectedKey) {
      row.classList.add('bg-brand/10', 'ring-1', 'ring-brand/30');
    }
    row.addEventListener('click', event => {
      const action = event.target.closest('[data-freeze]');
      if (action) {
        doFreeze(row.dataset.key, action.dataset.freeze === 'true');
        return;
      }
      rows.forEach(r => r.classList.remove('bg-brand/10', 'ring-1', 'ring-brand/30'));
      row.classList.add('bg-brand/10', 'ring-1', 'ring-brand/30');
      _selectedKey = row.getAttribute('data-key');
      navigator.clipboard.writeText(_selectedKey).then(() => {
        toast('Key copiada!');
      }).catch(() => { });
    });
  });
}

function copySelected() {
  if (!_selectedKey) { toast('Selecione uma linha na tabela primeiro.', true); return; }
  document.getElementById('revokeKey').value = _selectedKey;
  document.getElementById('modalRevoke').showModal();
}

function copySelectedToDelete() {
  if (!_selectedKey) { toast('Selecione uma linha na tabela primeiro.', true); return; }
  document.getElementById('deleteKey').value = _selectedKey;
  document.getElementById('modalDelete').showModal();
}

function copySelectedToTransfer() {
  if (!_selectedKey) { toast('Selecione uma linha na tabela primeiro.', true); return; }
  document.getElementById('transferKey').value = _selectedKey;
  document.getElementById('modalTransfer').showModal();
}

function copySelectedToHwid() {
  if (!_selectedKey) { toast('Selecione uma linha na tabela primeiro.', true); return; }
  document.getElementById('resetHwidKey').value = _selectedKey;
  document.getElementById('modalResetHwid').showModal();
}

function copyAllKeys() {
  const keys = _allKeyItems.map(i => i.key_value || i.KeyValue || '').filter(k => k);
  if (!keys.length) { toast('Nenhuma chave na lista.', true); return; }
  navigator.clipboard.writeText(keys.join('\n')).then(() => {
    toast(`${keys.length} chave${keys.length > 1 ? 's' : ''} copiada${keys.length > 1 ? 's' : ''}!`);
  }).catch(() => {
    toast('Erro ao copiar.', true);
  });
}

mobileKeysMedia.addEventListener('change', () => {
  if (_listLoaded) applyFilters();
});

document.getElementById('btnList').addEventListener('click', () => doList());
document.getElementById('btnRevokeSelected').addEventListener('click', () => copySelected());
document.getElementById('btnDeleteSelected').addEventListener('click', () => copySelectedToDelete());
document.getElementById('btnTransferSelected').addEventListener('click', () => copySelectedToTransfer());
document.getElementById('btnResetSelectedHwid').addEventListener('click', () => copySelectedToHwid());
document.getElementById('btnCopyAllKeys').addEventListener('click', () => copyAllKeys());
document.getElementById('filterSearch').addEventListener('input', () => applyFilters());
document.getElementById('filterStatus').addEventListener('change', () => applyFilters());
document.getElementById('filterProduct').addEventListener('change', () => applyFilters());
document.getElementById('filterDuration').addEventListener('change', () => applyFilters());
document.getElementById('btnClearKeyFilters').addEventListener('click', () => clearFilters());
document.getElementById('btnLoadMore').addEventListener('click', () => loadMoreKeys());
