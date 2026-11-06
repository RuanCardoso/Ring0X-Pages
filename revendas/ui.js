function setLoading(id, on) {
  const b = document.getElementById(id);
  if (!b) return;
  b.disabled = on;
  if (on) b.setAttribute('data-orig', b.textContent);
  else b.textContent = b.getAttribute('data-orig') || b.textContent;
  if (on) b.textContent = 'Processando…';
}

let _toastTimer;
function toast(msg, isErr) {
  const el = document.getElementById('toast');
  clearTimeout(_toastTimer);
  const hasPopover = typeof el.showPopover === 'function';
  if (hasPopover && el.matches(':popover-open')) el.hidePopover();
  const dialog = document.activeElement?.closest('dialog[open]') ||
    Array.from(document.querySelectorAll('dialog[open]')).pop();
  // Keep announcements inside the active modal's accessible subtree.
  (dialog || document.body).appendChild(el);
  const alert = document.createElement('div');
  alert.className = `alert ${isErr ? 'alert-error' : 'alert-success'} shadow-lg`;
  const text = document.createElement('span');
  text.textContent = String(msg ?? '');
  alert.appendChild(text);
  el.replaceChildren(alert);
  if (hasPopover) el.showPopover();
  _toastTimer = setTimeout(() => {
    if (hasPopover && el.matches(':popover-open')) el.hidePopover();
    el.replaceChildren();
  }, 3500);
}

let _confirmResolve = null;
function confirmModal(msg) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmMsg').textContent = msg;
    document.getElementById('confirmModal').showModal();
  });
}
function closeConfirm(accepted = false) {
  const resolve = _confirmResolve;
  _confirmResolve = null;
  document.getElementById('confirmModal').close();
  if (resolve) resolve(accepted === true);
}
document.getElementById('confirmYes').addEventListener('click', () => closeConfirm(true));
document.getElementById('confirmNo').addEventListener('click', () => closeConfirm());
document.getElementById('confirmModal').addEventListener('cancel', event => {
  event.preventDefault();
  closeConfirm();
});
document.querySelector('#confirmModal .modal-backdrop').addEventListener('submit', event => {
  event.preventDefault();
  closeConfirm();
});

function parseUtcDate(v) {
  if (!v) return null;
  // Backend grava/serializa TIMESTAMP sem timezone (ex: "2026-09-13T00:20:59.98").
  // O valor já É UTC, mas sem o 'Z' o navegador assumiria hora local, deslocando a
  // comparação pelo fuso do usuário. Forçamos UTC quando não há Z nem offset explícito.
  const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(v);
  const d = new Date(hasTz ? v : v + 'Z');
  return isNaN(d) ? null : d;
}

function fmtDate(v) {
  const d = parseUtcDate(v);
  return d ? d.toLocaleDateString('pt-BR') : (v ? String(v) : '—');
}


document.querySelectorAll('[data-stop-click]').forEach(box => {
  box.addEventListener('click', event => event.stopPropagation());
});
document.querySelectorAll('[data-open-dialog]').forEach(control => {
  control.addEventListener('click', () => document.getElementById(control.dataset.openDialog).showModal());
});
