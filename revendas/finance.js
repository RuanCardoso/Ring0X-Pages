let _financesLoaded = false;
let _financeRequestRevision = 0;

let _financePeriod = 'month';

function getFinanceRange() {
  const today = new Date().toISOString().slice(0, 10);
  // The existing API requires both dates, including for the complete history.
  if (_financePeriod === 'all') return { startDate: '0001-01-01', endDate: today };
  if (_financePeriod === 'day' || _financePeriod === 'week') {
    const startDate = document.getElementById('financeDate').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;
    const end = new Date(startDate + 'T00:00:00Z');
    if (!Number.isFinite(end.getTime()) || end.toISOString().slice(0, 10) !== startDate) return null;
    if (_financePeriod === 'week') end.setUTCDate(end.getUTCDate() + 6);
    if (end.getUTCFullYear() > 9998) return null;
    return { startDate, endDate: end.toISOString().slice(0, 10) };
  }
  const yearText = document.getElementById('financeYear').value;
  const year = Number(yearText);
  if (!/^\d{1,4}$/.test(yearText) || !Number.isInteger(year) || year < 1 || year > 9998) return null;
  const paddedYear = String(year).padStart(4, '0');
  if (_financePeriod === 'year') return { startDate: paddedYear + '-01-01', endDate: paddedYear + '-12-31' };
  const month = document.getElementById('financeMonth').value;
  if (!/^(0[1-9]|1[0-2])$/.test(month)) return null;
  const startDate = `${paddedYear}-${month}-01`;
  const end = new Date(startDate + 'T00:00:00Z');
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  return { startDate, endDate: end.toISOString().slice(0, 10) };
}

function updateFinancePeriod() {
  const range = getFinanceRange();
  const formatDate = date => date.split('-').reverse().join('/');
  document.getElementById('financeRangeLabel').textContent = !range
    ? 'Preencha o período para consultar.'
    : _financePeriod === 'all' ? `Todo o histórico até ${formatDate(range.endDate)} (UTC).`
    : range.startDate === range.endDate ? `${formatDate(range.startDate)} (UTC).`
    : `${formatDate(range.startDate)} a ${formatDate(range.endDate)} (UTC).`;
  markFinanceDirty();
}

function setFinancePeriod(period) {
  if (!['day', 'week', 'month', 'year', 'all'].includes(period)) return;
  _financePeriod = period;
  ['day', 'week', 'month', 'year', 'all'].forEach(value => {
    const button = document.getElementById('financePeriod-' + value);
    button.setAttribute('aria-pressed', String(value === period));
    button.classList.toggle('btn-brand', value === period);
    button.classList.toggle('btn-outline', value !== period);
    button.classList.toggle('border-base-content/20', value !== period);
  });
  const fields = {
    Date: period === 'day' || period === 'week',
    Month: period === 'month',
    Year: period === 'month' || period === 'year'
  };
  Object.entries(fields).forEach(([name, visible]) => {
    document.getElementById('finance' + name + 'Field').classList.toggle('hidden', !visible);
    const input = document.getElementById('finance' + name);
    input.disabled = !visible;
    input.required = visible;
  });
  document.getElementById('financePeriodNavigation').classList.toggle('hidden', period === 'all');
  document.getElementById('financeYearField').classList.toggle('sm:col-span-2', period === 'year');
  document.getElementById('financeDateLabel').textContent = period === 'week' ? 'Início dos 7 dias' : 'Data';
  updateFinancePeriod();
}

function ensureFinanceYear(year, firstYear) {
  const select = document.getElementById('financeYear');
  const selected = select.value;
  const currentYear = new Date().getUTCFullYear();
  const minimum = Math.min(2000, firstYear || currentYear, year);
  const maximum = Math.max(currentYear + 1, year);
  const years = new Set(Array.from(select.options, option => Number(option.value)));
  for (let value = minimum; value <= maximum; value++) years.add(value);
  const options = Array.from(years).sort((a, b) => b - a).map(value => {
    const option = document.createElement('option');
    option.value = String(value).padStart(4, '0');
    option.textContent = String(value);
    return option;
  });
  select.replaceChildren(...options);
  if (selected) select.value = selected;
}

function stepFinancePeriod(direction) {
  if ((direction !== -1 && direction !== 1) || _financePeriod === 'all') return;
  const range = getFinanceRange();
  if (!range) return;
  const next = new Date(range.startDate + 'T00:00:00Z');
  if (_financePeriod === 'month') next.setUTCMonth(next.getUTCMonth() + direction);
  else if (_financePeriod === 'year') next.setUTCFullYear(next.getUTCFullYear() + direction);
  else next.setUTCDate(next.getUTCDate() + direction * (_financePeriod === 'week' ? 7 : 1));
  const year = next.getUTCFullYear();
  if (year < 1 || year > 9998) return;
  if (_financePeriod === 'day' || _financePeriod === 'week') {
    const date = next.toISOString().slice(0, 10);
    if (date > document.getElementById('financeDate').max) return;
    document.getElementById('financeDate').value = date;
  } else {
    ensureFinanceYear(year);
    document.getElementById('financeYear').value = String(year).padStart(4, '0');
    document.getElementById('financeMonth').value = String(next.getUTCMonth() + 1).padStart(2, '0');
  }
  updateFinancePeriod();
}

function initFinanceDates() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('financeDate').value = today;
  document.getElementById('financeMonth').value = today.slice(5, 7);
  ensureFinanceYear(Number(today.slice(0, 4)));
  document.getElementById('financeYear').value = today.slice(0, 4);
  setFinancePeriod('month');
}

function markFinanceDirty() {
  _financesLoaded = false;
  _financeRequestRevision++;
  document.getElementById('financeMetrics').classList.add('hidden');
  document.getElementById('financeEmpty').classList.add('hidden');
  document.getElementById('financeStatus').textContent = 'Período alterado. Clique em Consultar.';
  const btn = document.getElementById('btnFinances');
  btn.disabled = false;
  btn.textContent = 'Consultar';
}

function formatStoreAge(dateOnly) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return 'Sem pagamentos registrados';
  const [year, month, day] = dateOnly.split('-').map(Number);
  const firstPayment = new Date(year, month - 1, day);
  if (firstPayment.getFullYear() !== year || firstPayment.getMonth() !== month - 1 || firstPayment.getDate() !== day) return 'Data inválida';
  const estimatedStart = new Date(year, month - 1, day - 7);
  const startYear = estimatedStart.getFullYear();
  const startMonth = estimatedStart.getMonth();
  const startDay = estimatedStart.getDate();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(startYear, startMonth, startDay)) / 86400000);
  if (days < 0) return 'Data futura';
  if (days === 0) return 'Hoje';

  let months = (today.getFullYear() - startYear) * 12 + today.getMonth() - startMonth;
  if (today.getDate() < startDay) months--;
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return `${years} ${years === 1 ? 'ano' : 'anos'}${remainingMonths ? ` e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}` : ''}`;
  }
  if (months >= 1) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  if (days >= 7) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}${remainingDays ? ` e ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}` : ''}`;
  }
  return `${days} ${days === 1 ? 'dia' : 'dias'}`;
}

function resetFinanceState() {
  markFinanceDirty();
  document.getElementById('financeStoreLabel').textContent = _fingerprint || 'LOJA';
  document.getElementById('financeFirstPayment').textContent = 'Aguardando consulta';
  document.getElementById('financeStoreAge').textContent = 'Aguardando consulta';
  document.getElementById('financeStatus').textContent = 'Selecione o período para consultar.';
}

async function loadFinances() {
  const status = document.getElementById('financeStatus');
  const btn = document.getElementById('btnFinances');
  const range = getFinanceRange();
  if (!_fingerprint) { status.textContent = 'Token sem fingerprint de loja.'; return; }
  if (!range) { status.textContent = 'Selecione um período válido para consultar.'; return; }
  const { startDate, endDate } = range;

  const revision = ++_financeRequestRevision;
  btn.disabled = true;
  btn.textContent = 'Consultando…';
  status.textContent = 'Consultando finanças da loja…';
  document.getElementById('financeMetrics').classList.add('hidden');
  document.getElementById('financeEmpty').classList.add('hidden');

  try {
    const data = await api('/admin/finance/get-finances', {
      startDate, endDate, type: 'Keys', fingerprint: _fingerprint
    });
    if (revision !== _financeRequestRevision) return;

    const revenue = Number(data.TotalRevenue ?? data.totalRevenue ?? 0);
    const sales = Number(data.TotalSales ?? data.totalSales ?? 0);
    const average = Number(data.AverageTicket ?? data.averageTicket ?? 0);
    const generatedCount = Number(data.GeneratedKeyCount ?? data.generatedKeyCount ?? 0);
    const generatedValue = Number(data.GeneratedKeyValue ?? data.generatedKeyValue ?? 0);
    if (![revenue, sales, average, generatedCount, generatedValue].every(Number.isFinite)) throw new Error('Resposta financeira inválida.');

    document.getElementById('financeGeneratedCount').textContent = generatedCount.toLocaleString('pt-BR');
    document.getElementById('financeGeneratedValue').textContent = fmt(generatedValue);
    document.getElementById('financeRevenue').textContent = fmt(revenue);
    document.getElementById('financeSales').textContent = sales.toLocaleString('pt-BR');
    document.getElementById('financeAverage').textContent = fmt(average);
    const firstPayment = data.FirstPaymentDate ?? data.firstPaymentDate;
    const firstDateOnly = firstPayment ? String(firstPayment).slice(0, 10) : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(firstDateOnly)) ensureFinanceYear(Number(document.getElementById('financeYear').value), Number(firstDateOnly.slice(0, 4)));
    document.getElementById('financeFirstPayment').textContent = /^\d{4}-\d{2}-\d{2}$/.test(firstDateOnly)
      ? firstDateOnly.split('-').reverse().join('/')
      : 'Nenhum pagamento registrado';
    document.getElementById('financeStoreAge').textContent = formatStoreAge(firstDateOnly);
    document.getElementById('financeMetrics').classList.remove('hidden');
    document.getElementById('financeEmpty').classList.toggle('hidden', sales !== 0);
    status.textContent = `Finanças de ${_fingerprint} no período selecionado.`;
    _financesLoaded = true;
  } catch (e) {
    if (revision !== _financeRequestRevision) return;
    status.textContent = e.message || 'Não foi possível consultar as finanças.';
    _financesLoaded = false;
  } finally {
    if (revision === _financeRequestRevision) {
      btn.disabled = false;
      btn.textContent = 'Consultar';
    }
  }
}

function openManualFinanceModal() {
  if (_fingerprint !== 'ADMINSTORE') return;
  const date = document.getElementById('manualFinanceDate');
  if (!date.value) date.value = new Date().toISOString().slice(0, 10);
  document.getElementById('modalManualFinance').showModal();
}

function generateManualFinanceReference() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  document.getElementById('manualFinanceReference').value =
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

let _manualFinanceBusy = false;

function updateManualFinanceAction() {
  if (_manualFinanceBusy) return;
  document.getElementById('btnManualFinance').textContent = document.getElementById('manualFinanceSettleDebt').checked
    ? 'Registrar e quitar' : 'Registrar entrada';
}

async function doAddManualFinance() {
  if (_manualFinanceBusy) return;
  if (_fingerprint !== 'ADMINSTORE') { toast('Acesso restrito ao administrador.', true); return; }
  const targetToken = document.getElementById('manualFinanceTargetToken').value.trim();
  const amount = document.getElementById('manualFinanceAmount').value.trim();
  const paymentDate = document.getElementById('manualFinanceDate').value;
  const reference = document.getElementById('manualFinanceReference').value.trim();
  const description = document.getElementById('manualFinanceDescription').value.trim();
  const settleDebt = document.getElementById('manualFinanceSettleDebt').checked;
  const targetPayload = parseJwt(targetToken);
  const targetFingerprint = String(targetPayload?.fingerprint ?? targetPayload?.Fingerprint ?? '').trim().toUpperCase();

  if (!targetToken || !targetFingerprint) { toast('Informe um token válido da loja de destino.', true); return; }
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || Number(amount) > 9999999999.99) {
    toast('Informe um valor positivo em reais, com até duas casas decimais.', true); return;
  }
  if (!paymentDate || !reference) { toast('Informe a data e a referência.', true); return; }
  const tokenAtStart = document.getElementById('token').value;
  const isCurrent = () => document.getElementById('token').value === tokenAtStart && _fingerprint === 'ADMINSTORE';
  const message = `Registrar ${fmt(Number(amount))} em ${targetFingerprint} no dia ${paymentDate}? ` + (settleDebt
    ? 'Isso também quitará o saldo devedor integral da loja. Se o valor não conferir, nada será registrado.'
    : 'Isso altera apenas as finanças, sem quitar dívidas.');

  _manualFinanceBusy = true;
  document.getElementById('manualFinanceFields').disabled = true;
  document.getElementById('manualFinanceClose').disabled = true;
  setLoading('btnManualFinance', true);
  try {
    if (!await confirmModal(message) || !isCurrent()) return;
    const result = await api('/admin/finance/add-manual-entry', { targetToken, amount, paymentDate, reference, description, settleDebt });
    if (!isCurrent()) return;
    toast(result?.StatusMessage || (settleDebt ? 'Entrada registrada e saldo devedor quitado.' : 'Entrada financeira registrada.'));
    document.getElementById('manualFinanceAmount').value = '';
    document.getElementById('manualFinanceReference').value = '';
    document.getElementById('manualFinanceDescription').value = '';
    document.getElementById('manualFinanceSettleDebt').checked = false;
    _financesLoaded = false;
    if (!document.getElementById('panel-finance').classList.contains('hidden')) loadFinances();
    if (settleDebt && targetFingerprint === _fingerprint) {
      invalidateList();
      loadDebtBalance();
    }
  } catch (e) {
    if (isCurrent()) toast('Erro: ' + e.message, true);
  } finally {
    _manualFinanceBusy = false;
    document.getElementById('manualFinanceFields').disabled = false;
    document.getElementById('manualFinanceClose').disabled = false;
    setLoading('btnManualFinance', false);
    updateManualFinanceAction();
    if (isCurrent() && document.getElementById('modalManualFinance').open) document.getElementById('manualFinanceAmount').focus();
  }
}

document.getElementById('btnOpenManualFinance').addEventListener('click', () => openManualFinanceModal());
document.getElementById('financeFilters').addEventListener('submit', event => { event.preventDefault(); loadFinances(); });
document.getElementById('financePeriod-day').addEventListener('click', () => setFinancePeriod('day'));
document.getElementById('financePeriod-week').addEventListener('click', () => setFinancePeriod('week'));
document.getElementById('financePeriod-month').addEventListener('click', () => setFinancePeriod('month'));
document.getElementById('financePeriod-year').addEventListener('click', () => setFinancePeriod('year'));
document.getElementById('financePeriod-all').addEventListener('click', () => setFinancePeriod('all'));
document.getElementById('financePrevious').addEventListener('click', () => stepFinancePeriod(-1));
document.getElementById('financeDate').addEventListener('change', () => updateFinancePeriod());
document.getElementById('financeMonth').addEventListener('change', () => updateFinancePeriod());
document.getElementById('financeYear').addEventListener('change', () => updateFinancePeriod());
document.getElementById('financeNext').addEventListener('click', () => stepFinancePeriod(1));
document.getElementById('modalManualFinance').addEventListener('cancel', event => {
  if (_manualFinanceBusy) event.preventDefault();
});
document.getElementById('modalManualFinance').addEventListener('close', () => { document.getElementById('manualFinanceForm').reset(); updateManualFinanceAction(); });
document.getElementById('manualFinanceForm').addEventListener('submit', event => { event.preventDefault(); doAddManualFinance(); });
document.getElementById('btnGenerateFinanceReference').addEventListener('click', () => generateManualFinanceReference());
document.getElementById('manualFinanceSettleDebt').addEventListener('change', () => updateManualFinanceAction());
document.getElementById('manualFinanceBackdrop').addEventListener('submit', event => {
  if (_manualFinanceBusy) event.preventDefault();
});
