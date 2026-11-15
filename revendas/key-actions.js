async function doRevoke() {
  setLoading('btnRevoke', true);
  try {
    const k = document.getElementById('revokeKey').value.trim();
    if (!k) throw new Error('Informe a key.');
    const r = await api('/admin/auth-keys/revoke', { keyValue: k });
    toast(r?.StatusMessage || 'Key revogada com sucesso!');
    invalidateList();
  } catch (e) {
    toast('Erro: ' + e.message, true);
  }
  setLoading('btnRevoke', false);
}

async function doDelete() {
  const k = document.getElementById('deleteKey').value.trim();
  if (!k) { toast('Informe a key.', true); return; }
  if (!await confirmModal('Deseja realmente deletar essa key permanentemente? Essa ação não pode ser desfeita.')) return;

  setLoading('btnDelete', true);
  try {
    const r = await api('/admin/auth-keys/delete', { keyValue: k });
    toast(r?.StatusMessage || 'Key deletada com sucesso!');
    document.getElementById('modalDelete').close();
    invalidateList();
  } catch (e) {
    toast('Erro: ' + e.message, true);
  }
  setLoading('btnDelete', false);
}

async function doTransfer() {
  const k = document.getElementById('transferKey').value.trim();
  const targetToken = document.getElementById('transferTargetToken').value.trim();
  if (!k) { toast('Informe a key.', true); return; }
  if (!targetToken) { toast('Informe o token da loja destino.', true); return; }
  if (!await confirmModal('Deseja realmente transferir essa key para a loja destino?')) return;

  setLoading('btnTransfer', true);
  try {
    const r = await api('/admin/auth-keys/transfer', { keyValue: k, targetToken });
    toast(r?.StatusMessage || 'Key transferida com sucesso!');
    document.getElementById('modalTransfer').close();
    document.getElementById('transferTargetToken').value = '';
    invalidateList();
  } catch (e) {
    toast('Erro: ' + e.message, true);
  }
  setLoading('btnTransfer', false);
}

let _editingKeyPrefix = null;

function openKeyPrefixEditor(keyValue) {
  const input = document.getElementById('editKeyPrefixInput');
  if (input.disabled) return;
  const parts = /^(.+)(-[0-9]+[Dd]-[A-Za-z0-9]+)$/.exec(keyValue);
  if (!parts) {
    toast('Formato de chave incompatível com a edição de prefixo.', true);
    return;
  }

  const [, prefix, tail] = parts;
  _editingKeyPrefix = { keyValue, tail, token: document.getElementById('token').value };
  input.maxLength = 255 - tail.length;
  input.value = prefix;
  updateKeyPrefixPreview();
  document.getElementById('modalEditKeyPrefix').showModal();
  input.select();
}

function updateKeyPrefixPreview() {
  const prefix = document.getElementById('editKeyPrefixInput').value.trim().toUpperCase();
  const preview = document.getElementById('editKeyPrefixPreview');
  preview.textContent = KEY_PREFIX_PATTERN.test(prefix) ? prefix + _editingKeyPrefix.tail : 'Informe um prefixo válido';
}

async function doEditKeyPrefix(event) {
  event.preventDefault();
  const input = document.getElementById('editKeyPrefixInput');
  const token = document.getElementById('token');
  const dialog = document.getElementById('modalEditKeyPrefix');
  if (input.disabled || !_editingKeyPrefix) return;
  const { keyValue, tail, token: tokenAtOpen } = _editingKeyPrefix;
  if (token.value !== tokenAtOpen) {
    dialog.close();
    return;
  }

  const newPrefix = input.value.trim().toUpperCase();
  if (!KEY_PREFIX_PATTERN.test(newPrefix) || (newPrefix + tail).length > 255) {
    toast('Informe um prefixo válido. Use letras e números separados por hífens.', true);
    input.focus();
    return;
  }
  if (newPrefix + tail === keyValue) {
    dialog.close();
    return;
  }

  input.disabled = true;
  setLoading('btnSaveKeyPrefix', true);
  try {
    const result = await api('/admin/auth-keys/update-prefix', { keyValue, newPrefix });
    if (token.value !== tokenAtOpen) return;
    dialog.close();
    toast(result?.StatusMessage || 'Prefixo atualizado com sucesso.');
    invalidateList();
  } catch (e) {
    if (token.value === tokenAtOpen) toast('Erro: ' + e.message, true);
  } finally {
    input.disabled = false;
    setLoading('btnSaveKeyPrefix', false);
  }
}

document.getElementById('btnEditKeyPrefix')?.addEventListener('click', event => {
  document.getElementById('keyContextMenu').hidePopover();
  openKeyPrefixEditor(event.currentTarget.dataset.key);
});
document.getElementById('editKeyPrefixInput')?.addEventListener('input', updateKeyPrefixPreview);
document.getElementById('editKeyPrefixForm')?.addEventListener('submit', doEditKeyPrefix);

async function doResetHwid() {
  setLoading('btnResetHwid', true);
  try {
    const k = document.getElementById('resetHwidKey').value.trim();
    if (!k) throw new Error('Informe a key.');
    const r = await api('/admin/auth-keys/reset-hwid', { keyValue: k });
    toast(r?.StatusMessage || 'HWID reset habilitado com sucesso!');
    invalidateList();
  } catch (e) {
    toast('Erro: ' + e.message, true);
  }
  setLoading('btnResetHwid', false);
}

async function doActivate() {
  setLoading('btnActivate', true);
  try {
    const k = document.getElementById('activateKey').value.trim();
    if (!k) throw new Error('Informe a key.');
    const testHwid = 'TEST-HWID-SIMULATED-PC-' + navigator.userAgent.length;
    const activateProduct = document.getElementById('activateProduct').value;
    const r = await api('/user/auth-keys/activate', { keyValue: k, hwid: testHwid, productType: activateProduct });
    toast(r?.StatusMessage || 'Key ativada com sucesso!');
    invalidateList();
  } catch (e) {
    toast('Erro: ' + e.message, true);
  }
  setLoading('btnActivate', false);
}

function getFreezeProduct(key) {
  if (key === 'ALL') return document.getElementById('freezeProductModal').value;
  const row = document.querySelector(`tr[data-key="${key.replace(/"/g, '&quot;')}"]`);
  return row ? row.getAttribute('data-product') : 'PB';
}

function doFreezeFromModal(freeze) {
  doFreeze('ALL', freeze);
}

async function doFreeze(key, freeze) {
  if (key === 'ALL') {
    if (!await confirmModal('Deseja realmente ' + (freeze ? 'congelar' : 'descongelar') + ' TODAS as keys ativas deste produto?')) return;
  }
  try {
    const productType = getFreezeProduct(key);
    const r = await api('/admin/auth-keys/freeze', { keyValue: key, freeze: freeze, productType });
    toast(r?.StatusMessage || 'Ação realizada com sucesso!');
    invalidateList();
  } catch (e) {
    toast('Erro: ' + e.message, true);
  }
}

document.getElementById('btnRevoke').addEventListener('click', () => doRevoke());
document.getElementById('btnDelete').addEventListener('click', () => doDelete());
document.getElementById('btnTransfer').addEventListener('click', () => doTransfer());
document.getElementById('btnResetHwid').addEventListener('click', () => doResetHwid());
document.getElementById('btnActivate').addEventListener('click', () => doActivate());
document.getElementById('btnFreezeAll').addEventListener('click', () => doFreezeFromModal(true));
document.getElementById('btnUnfreezeAll').addEventListener('click', () => doFreezeFromModal(false));
