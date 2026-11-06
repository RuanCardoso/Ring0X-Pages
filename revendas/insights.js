let _insightsLoadedAt = 0;
let _insightsDirty = true;
let _insightsRevision = 0;
let _insightsRequest = null;

function isInsightsVisible() {
  return !document.getElementById('appShell').classList.contains('hidden') &&
    !document.getElementById('panel-insights').classList.contains('hidden');
}

function resetInsightsState() {
  _insightsRevision++;
  _insightsRequest = null;
  _insightsLoadedAt = 0;
  _insightsDirty = true;
  setLoading('btnInsights', false);
  document.getElementById('panel-insights').setAttribute('aria-busy', 'false');
  ['insightsResults', 'insightsLoading', 'insightsError'].forEach(id => document.getElementById(id).classList.add('hidden'));
  document.getElementById('insightsError').textContent = '';
  document.getElementById('insightsStatus').textContent = 'Abra esta aba para consultar os insights da loja.';
  ['renewals', 'abandonment', 'estimatedRenewals'].forEach(prefix => {
    document.getElementById(prefix + 'Items').replaceChildren();
    document.getElementById(prefix + 'Total').textContent = '—';
    document.getElementById(prefix + 'Count').textContent = '';
    document.getElementById(prefix + 'Empty').classList.add('hidden');
  });
}

function invalidateInsights() {
  _insightsDirty = true;
  _insightsRevision++;
  if (isInsightsVisible()) loadInsights(false);
}

function insightDayLabel(value) {
  return `${value} ${value === 1 ? 'dia' : 'dias'}`;
}

function renderInsightGroup(prefix, group) {
  const body = document.getElementById(prefix + 'Items');
  body.replaceChildren();
  document.getElementById(prefix + 'Total').textContent = group.total.toLocaleString('pt-BR');
  document.getElementById(prefix + 'Empty').classList.toggle('hidden', group.total !== 0);
  document.getElementById(prefix + 'Count').textContent = group.total
    ? `${group.items.length} de ${group.total.toLocaleString('pt-BR')} chaves exibidas`
    : '';

  group.items.forEach(item => {
    const row = document.createElement('li');
    row.className = 'py-4 first:pt-0 last:pb-0';
    row.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <p class="insight-product text-xs font-semibold text-base-content/70 mb-1.5"></p>
          <p class="insight-key mono text-[11px] break-all leading-relaxed"></p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs shrink-0">Copiar</button>
      </div>
      <p class="insight-summary text-xs font-medium mt-3"></p>
      <p class="insight-dates text-[11px] text-base-content/50 mt-1.5 leading-relaxed"></p>`;
    row.querySelector('.insight-product').textContent = productLabel(resolveProductCode(item.productType));
    row.querySelector('.insight-key').textContent = item.keyValue;
    const summary = row.querySelector('.insight-summary');
    const dates = row.querySelector('.insight-dates');
    if (prefix === 'estimatedRenewals') {
      summary.classList.add('text-success');
      summary.textContent = `Renovou em ${fmtDate(item.renewedAt)}`;
      dates.classList.add('break-words');
      dates.textContent = `Anterior: ${item.previousKeyValue} (até ${fmtDate(item.previousEndsAt)}) · Nova válida até ${fmtDate(item.endsAt)}`;
    } else {
      const remaining = insightDayLabel(item.daysRemaining);
      const unused = insightDayLabel(item.daysSinceLastUse);
      summary.classList.add(prefix === 'renewals' ? 'text-warning' : 'text-info');
      summary.textContent = prefix === 'renewals'
        ? `${item.daysRemaining === 1 ? 'Vence em até 24h' : `Vence em até ${remaining}`} · ${item.daysSinceLastUse === 0 ? 'Uso há menos de 24h' : `Sem uso há ${unused}`}`
        : `Sem uso há ${unused} · ${remaining} de validade restantes`;
      dates.textContent = `Vencimento: ${fmtDate(item.endsAt)} · Último uso: ${fmtDate(item.lastUsedAt)}`;
    }
    const copy = row.querySelector('button');
    copy.setAttribute('aria-label', `Copiar chave ${item.keyValue}`);
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(item.keyValue);
        toast('Key copiada!');
      } catch (e) {
        toast('Não foi possível copiar a chave.', true);
      }
    });
    body.appendChild(row);
  });
}

function validateInsights(data) {
  const validDays = value => Number.isInteger(value) && value > 0;
  if (!data || !parseUtcDate(data.generatedAt) || !validDays(data.renewalWindowDays) ||
      !validDays(data.inactivityDays) || !validDays(data.limitPerInsight)) {
    throw new Error('O servidor retornou insights inválidos.');
  }
  for (const group of [data.priorityRenewals, data.possibleAbandonment]) {
    if (!group || !Number.isSafeInteger(group.total) || group.total < 0 || !Array.isArray(group.items) ||
        group.items.length !== Math.min(group.total, data.limitPerInsight) ||
        group.items.some(item => !item || typeof item.keyValue !== 'string' || !item.keyValue ||
          !parseUtcDate(item.endsAt) || !parseUtcDate(item.lastUsedAt) ||
          !Number.isInteger(item.daysRemaining) || item.daysRemaining < 1 ||
          !Number.isInteger(item.daysSinceLastUse) || item.daysSinceLastUse < 0)) {
      throw new Error('O servidor retornou insights inválidos.');
    }
  }
  // Older backends can still serve the original two insights during rollout.
  const estimates = data.estimatedRenewals;
  if (estimates != null && (estimates.isEstimate !== true || !validDays(estimates.periodDays) ||
      !Number.isSafeInteger(estimates.total) || estimates.total < 0 || !Array.isArray(estimates.items) ||
      estimates.items.length !== Math.min(estimates.total, data.limitPerInsight) ||
      estimates.items.some(item => !item || typeof item.keyValue !== 'string' || !item.keyValue ||
        typeof item.previousKeyValue !== 'string' || !item.previousKeyValue || !parseUtcDate(item.renewedAt) ||
        (item.endsAt != null && !parseUtcDate(item.endsAt)) ||
        (item.previousEndsAt != null && !parseUtcDate(item.previousEndsAt))))) {
    throw new Error('O servidor retornou estimativas de renovação inválidas.');
  }
  return data;
}

async function loadInsights(force = true) {
  const token = document.getElementById('token').value;
  if (!token || !_fingerprint) return;
  if (_insightsRequest?.revision === _insightsRevision && _insightsRequest.token === token) return _insightsRequest.promise;
  if (!force && !_insightsDirty && Date.now() - _insightsLoadedAt < LIST_MAX_AGE_MS) return;

  const request = { revision: _insightsRevision, token, promise: null };
  _insightsRequest = request;
  const isCurrent = () => _insightsRequest === request && request.revision === _insightsRevision &&
    request.token === document.getElementById('token').value;
  _insightsDirty = true;
  if (!document.getElementById('btnInsights').disabled) setLoading('btnInsights', true);
  document.getElementById('panel-insights').setAttribute('aria-busy', 'true');
  document.getElementById('insightsResults').classList.add('hidden');
  document.getElementById('insightsError').classList.add('hidden');
  document.getElementById('insightsLoading').classList.remove('hidden');
  document.getElementById('insightsStatus').textContent = 'Consultando insights da loja…';

  request.promise = (async () => {
    try {
      const response = await api('/admin/auth-keys/insights', {});
      if (!isCurrent()) return;
      const data = validateInsights(response?.Result ?? response?.result);
      renderInsightGroup('renewals', data.priorityRenewals);
      renderInsightGroup('abandonment', data.possibleAbandonment);
      if (data.estimatedRenewals) {
        document.getElementById('estimatedRenewalsEmpty').textContent = 'Nenhuma renovação no período.';
        renderInsightGroup('estimatedRenewals', data.estimatedRenewals);
        document.getElementById('estimatedRenewalsDescription').textContent = `Últimos ${insightDayLabel(data.estimatedRenewals.periodDays)} · Mesmo produto e dispositivo.`;
      } else {
        document.getElementById('estimatedRenewalsItems').replaceChildren();
        document.getElementById('estimatedRenewalsTotal').textContent = '—';
        document.getElementById('estimatedRenewalsCount').textContent = '';
        document.getElementById('estimatedRenewalsEmpty').textContent = 'Disponível após atualizar o backend.';
        document.getElementById('estimatedRenewalsEmpty').classList.remove('hidden');
      }
      document.getElementById('renewalsDescription').textContent = `Vencem em até ${insightDayLabel(data.renewalWindowDays)} e tiveram uso nos últimos ${insightDayLabel(data.inactivityDays)}.`;
      document.getElementById('abandonmentDescription').textContent = `Ainda válidas, sem uso há pelo menos ${insightDayLabel(data.inactivityDays)}.`;
      document.getElementById('insightsStatus').textContent = `Atualizado em ${parseUtcDate(data.generatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.`;
      document.getElementById('insightsResults').classList.remove('hidden');
      _insightsLoadedAt = Date.now();
      _insightsDirty = false;
    } catch (e) {
      if (!isCurrent()) return;
      const error = document.getElementById('insightsError');
      error.textContent = `${e.message || 'Não foi possível consultar os insights.'} Clique em Atualizar insights para tentar novamente.`;
      error.classList.remove('hidden');
      document.getElementById('insightsStatus').textContent = 'Consulta não concluída.';
    } finally {
      if (_insightsRequest === request) {
        _insightsRequest = null;
        setLoading('btnInsights', false);
        document.getElementById('panel-insights').setAttribute('aria-busy', 'false');
        document.getElementById('insightsLoading').classList.add('hidden');
      }
    }
  })();
  return request.promise;
}

document.getElementById('btnInsights').addEventListener('click', () => loadInsights());
