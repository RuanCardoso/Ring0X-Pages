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
