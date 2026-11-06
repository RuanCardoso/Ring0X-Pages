const TAB_IDS = ['admin', 'list', 'insights', 'finance'];

function toggleSidebar() {
  const sidebar = document.getElementById('pricingSidebar');
  const button = document.getElementById('sidebarToggle');
  const isOpen = sidebar.classList.toggle('is-open');
  button.setAttribute('aria-expanded', String(isOpen));
}

function switchTab(t) {
  document.querySelectorAll('#panelTabs .tab').forEach((b, i) => {
    if (TAB_IDS[i] === t) {
      b.classList.add('tab-active');
    } else {
      b.classList.remove('tab-active');
    }
  });
  TAB_IDS.forEach(id => {
    const panel = document.getElementById('panel-' + id);
    if (id === t) {
      panel.classList.remove('hidden');
      panel.classList.add('block');
    } else {
      panel.classList.add('hidden');
      panel.classList.remove('block');
    }
  });
  document.getElementById('billingNotice').classList.toggle('hidden', t !== 'admin');
  if (t === 'list') doList(false);
  if (t === 'insights') loadInsights(false);
  if (t === 'finance' && !_financesLoaded) loadFinances();
}

document.getElementById('sidebarToggle').addEventListener('click', () => toggleSidebar());
document.getElementById('btnPanelCustomize').addEventListener('click', () => StorePanelCustomizer.open());
document.getElementById('tab-admin').addEventListener('click', () => switchTab('admin'));
document.getElementById('tab-list').addEventListener('click', () => switchTab('list'));
document.getElementById('tab-insights').addEventListener('click', () => switchTab('insights'));
document.getElementById('tab-finance').addEventListener('click', () => switchTab('finance'));
document.getElementById('panelEditorClose').addEventListener('click', () => StorePanelCustomizer.close());
document.getElementById('panelEditorForm').addEventListener('submit', event => StorePanelCustomizer.save(event));
document.getElementById('panelEditorTab-identity').addEventListener('click', () => StorePanelCustomizer.setTab('identity'));
document.getElementById('panelEditorTab-colors').addEventListener('click', () => StorePanelCustomizer.setTab('colors'));
document.getElementById('panelEditorTab-style').addEventListener('click', () => StorePanelCustomizer.setTab('style'));
document.getElementById('panelPreset-default').addEventListener('click', () => StorePanelCustomizer.preset('default'));
document.getElementById('panelPreset-green').addEventListener('click', () => StorePanelCustomizer.preset('green'));
document.getElementById('panelPreset-blue').addEventListener('click', () => StorePanelCustomizer.preset('blue'));
document.getElementById('panelPreset-purple').addEventListener('click', () => StorePanelCustomizer.preset('purple'));
document.getElementById('panelPreset-light').addEventListener('click', () => StorePanelCustomizer.preset('light'));
document.getElementById('panelEditorReset').addEventListener('click', () => StorePanelCustomizer.resetDraft());
document.getElementById('panelEditorCancel').addEventListener('click', () => StorePanelCustomizer.close());
document.getElementById('panelEditorBackdrop').addEventListener('click', () => StorePanelCustomizer.close());

StorePanelCustomizer.init({
  getSession: () => ({ token: document.getElementById('token').value, store: _fingerprint }),
  isAuthenticated: () => !document.getElementById('appShell').classList.contains('hidden'),
  save: panelSettings => api('/admin/stores/panel-settings', { panelSettings }),
  onSaved: () => toast('Aparência salva!')
});
initFinanceDates();
loadToken();
updateCalc();
updateCreateCost();
