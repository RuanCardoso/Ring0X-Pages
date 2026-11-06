// Decodifica o payload do token para uso na interface. A autenticação é feita pela API.
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

let _fingerprint = '';
function setFingerprintFromToken(val) {
  const payload = parseJwt(val);
  _fingerprint = (payload && (payload.fingerprint ?? payload.Fingerprint)) || '';
  document.getElementById('createStorePrefix').checked = true;
  document.getElementById('createPrefix').value = '';
  updateKeyPreview();
  updateAdminOnlyVisibility();
  resetFinanceState();
  resetInsightsState();
}

// Ferramentas administrativas só aparecem para o fingerprint ADMINSTORE.
function updateAdminOnlyVisibility() {
  const isAdmin = _fingerprint === 'ADMINSTORE';
  const ids = ['menuItemDelete', 'btnDeleteSelected', 'menuItemTransfer', 'btnTransferSelected', 'menuItemManualFinance'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !isAdmin);
  });
}

const TOKEN_KEY = 'ring_admin_token';

function showAuthLoading(msg) {
  const el = document.getElementById('authLoading');
  const label = document.getElementById('authLoadingLabel');
  if (label) label.textContent = msg || 'Validando acesso…';
  el.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function hideAuthLoading() {
  document.getElementById('authLoading').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

function showLogin(errorMsg) {
  StorePanelCustomizer.resetSession();
  resetInsightsState();
  PRICES = {};
  updateCalc();
  updateCreateCost();
  stopDebtCountdown();
  _debtBalanceRevision++;
  document.getElementById('pixCoupon').value = '';
  updatePixCouponButton();
  if (document.getElementById('modalPixCoupon').open) document.getElementById('modalPixCoupon').close();
  document.getElementById('paymentAmountSummary').classList.add('hidden');
  hideAuthLoading();
  document.getElementById('loginGate').classList.remove('hidden');
  document.getElementById('appShell').classList.add('hidden');
  document.body.classList.add('overflow-hidden');
  const err = document.getElementById('loginError');
  if (err) err.textContent = errorMsg || '';
  const input = document.getElementById('loginToken');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 50);
  }
}

function showApp() {
  hideAuthLoading();
  document.getElementById('loginGate').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  document.body.classList.remove('overflow-hidden');
  if (isListVisible()) doList(false);
  if (isInsightsVisible()) loadInsights(false);
  if (!document.getElementById('panel-finance').classList.contains('hidden') && !_financesLoaded) loadFinances();
}

function applyAuthToken(val) {
  localStorage.setItem(TOKEN_KEY, val);
  document.getElementById('token').value = val;
}

async function validateToken(val) {
  StorePanelCustomizer.resetSession();
  document.getElementById('token').value = val;
  PRICES = {};
  updateCalc();
  updateCreateCost();
  const response = await api('/admin/stores/current', {});
  if (document.getElementById('token').value !== val) throw new Error('A sessão foi alterada. Entre novamente.');
  applyStoreConfiguration(response.Result);
  return response;
}

async function doLogin(e) {
  if (e) e.preventDefault();
  const val = (document.getElementById('loginToken').value || '').trim();
  const err = document.getElementById('loginError');
  const btn = document.getElementById('btnLogin');
  if (!val) {
    err.textContent = 'Digite o Bearer token.';
    return;
  }

  const hadSaved = !!localStorage.getItem(TOKEN_KEY);
  err.textContent = '';
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = 'Validando…';
  showAuthLoading('Validando token…');

  try {
    await validateToken(val);
    applyAuthToken(val);
    setFingerprintFromToken(val);
    showApp();
    loadDebtBalance();
  } catch (ex) {
    hideAuthLoading();
    if (!hadSaved) document.getElementById('token').value = '';
    else document.getElementById('token').value = localStorage.getItem(TOKEN_KEY) || '';
    err.textContent = ex.message || 'Token inválido.';
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

async function loadToken() {
  const saved = localStorage.getItem(TOKEN_KEY);
  if (!saved) {
    showLogin();
    return;
  }

  showAuthLoading('Validando acesso…');
  document.getElementById('token').value = saved;

  try {
    await validateToken(saved);
    setFingerprintFromToken(saved);
    showApp();
    loadDebtBalance();
  } catch (ex) {
    localStorage.removeItem(TOKEN_KEY);
    document.getElementById('token').value = '';
    showLogin(ex.message || 'Token inválido. Faça login novamente.');
  }
}

function clearToken() {
  stopDebtCountdown();
  _debtBalanceRevision++;
  document.getElementById('pixCoupon').value = '';
  updatePixCouponButton();
  if (document.getElementById('modalPixCoupon').open) document.getElementById('modalPixCoupon').close();
  document.getElementById('paymentAmountSummary').classList.add('hidden');
  localStorage.removeItem(TOKEN_KEY);
  document.getElementById('token').value = '';
  _fingerprint = '';
  resetListState();
  resetFinanceState();
  updateAdminOnlyVisibility();
  showLogin();
}

document.getElementById('loginForm').addEventListener('submit', event => doLogin(event));
document.getElementById('btnLogout').addEventListener('click', () => clearToken());
