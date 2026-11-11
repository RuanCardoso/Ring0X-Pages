let _lastCreatedKeys = [];

function rnd(n) {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let o = '';
  for (let i = 0; i < n; i++) o += c[Math.floor(Math.random() * c.length)];
  return o;
}

function updateCreateCost() {
  const qty = Number(document.getElementById('createQty').value);
  const days = Number(document.getElementById('createDays').value) || 0;
  const product = document.getElementById('createProduct').value;
  const prices = PRICES[product];
  const unit = prices?.[PRICE_DURATIONS[days]];
  const validQty = Number.isInteger(qty) && qty >= 1 && qty <= 100;
  document.getElementById('createCost').textContent = unit === undefined || !validQty ? '—' : fmt(unit * qty);
}

const DURATION_CODE = { 1: '1D', 7: '7D', 30: '30D', 90: '90D', 365: '365D' };
const KEY_PREFIX_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

function getCustomKeyPrefix() {
  return document.getElementById('createPrefix').value.trim().toUpperCase();
}

function formatKeyValue(prefix, durationCode, suffix) {
  return `${prefix}-${durationCode}-${suffix}`;
}

function updateKeyPreview() {
  const custom = document.getElementById('createCustomPrefix').checked;
  const input = document.getElementById('createPrefix');
  const preview = document.getElementById('createKeyPreview');
  document.getElementById('createPrefixField').classList.toggle('hidden', !custom);
  input.disabled = !custom;

  const durationCode = DURATION_CODE[Number(document.getElementById('createDays').value)];
  const prefix = custom ? getCustomKeyPrefix() : document.getElementById('createProduct').value;
  if (custom && !KEY_PREFIX_PATTERN.test(prefix)) {
    preview.textContent = 'Informe um prefixo válido';
    return;
  }
  if (!prefix) {
    preview.textContent = 'Selecione o produto';
    return;
  }
  preview.textContent = durationCode
    ? formatKeyValue(prefix, durationCode, 'XXXXXX')
    : 'Selecione a duração';
}

function onQtyChange() {
  const qty = Number(document.getElementById('createQty').value);
  const btn = document.getElementById('btnCreate');
  const label = Number.isInteger(qty) && qty > 1 && qty <= 100 ? `Revisar ${qty} chaves` : 'Revisar criação';
  btn.setAttribute('data-orig', label);
  if (!btn.disabled) btn.textContent = label;
  updateCreateCost();
}

function reviewKeyCreation({ product, quantity, duration, mode, pattern, total }) {
  const dialog = document.getElementById('modalCreateReview');
  document.getElementById('createReviewProduct').textContent = product;
  document.getElementById('createReviewQuantity').textContent = quantity;
  document.getElementById('createReviewDuration').textContent = duration;
  document.getElementById('createReviewMode').textContent = mode;
  document.getElementById('createReviewPattern').textContent = pattern;
  document.getElementById('createReviewTotal').textContent = total;
  document.getElementById('createReviewAccept').textContent = `Gerar ${quantity}`;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'create'), { once: true });
  });
}

async function doCreate() {
  const button = document.getElementById('btnCreate');
  if (button.disabled) return;
  const qty = Number(document.getElementById('createQty').value);
  const d = Number(document.getElementById('createDays').value);
  const product = document.getElementById('createProduct');
  const productType = product.value;
  const durationCode = DURATION_CODE[d];
  const unit = PRICES[productType]?.[PRICE_DURATIONS[d]];

  if (!productType) { toast('Selecione um produto.', true); return; }
  if (!durationCode) { toast('Selecione uma duração válida.', true); return; }
  if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
    toast('Informe uma quantidade inteira de 1 a 100.', true); return;
  }
  if (unit === undefined) {
    toast('Os preços da loja não foram carregados. Entre novamente.', true); return;
  }
  if (!_fingerprint) {
    toast('Fingerprint não encontrado no token. Faça login novamente.', true); return;
  }

  const custom = document.getElementById('createCustomPrefix').checked;
  const prefix = custom ? getCustomKeyPrefix() : productType;
  if (custom && !KEY_PREFIX_PATTERN.test(prefix)) {
    toast('Informe um prefixo com letras e números, separados por hífens.', true);
    document.getElementById('createPrefix').focus();
    return;
  }
  const review = {
    product: product.selectedOptions[0].textContent.trim(),
    quantity: qty === 1 ? '1 chave' : `${qty} chaves`,
    duration: `${d} ${d === 1 ? 'dia' : 'dias'}`,
    mode: custom ? 'Prefixo personalizado' : 'Prefixo do produto',
    pattern: formatKeyValue(prefix, durationCode, 'XXXXXX'),
    total: fmt(unit * qty)
  };

  const token = document.getElementById('token');
  const tokenAtStart = token.value;
  button.disabled = true;
  try {
    const accepted = await reviewKeyCreation(review);
    if (!accepted || token.value !== tokenAtStart) return;

    setLoading('btnCreate', true);
    const createdKeys = [];
    let failed = 0;
    for (let i = 0; i < qty && token.value === tokenAtStart; i++) {
      const keyValue = formatKeyValue(prefix, durationCode, rnd(6));
      try {
        await api('/admin/auth-keys/create', { keyValue, durationDays: String(d), productType });
        createdKeys.push(keyValue);
      } catch {
        failed++;
      }
    }

    if (token.value !== tokenAtStart) return;
    _lastCreatedKeys = createdKeys;
    document.getElementById('btnCopyCreated').classList.toggle('hidden', !createdKeys.length);
    if (createdKeys.length) {
      loadDebtBalance();
      invalidateList();
    }
    if (failed) {
      toast(`${createdKeys.length} de ${qty} chaves criadas. Falharam ${failed}.`, true);
    } else {
      toast(qty === 1 ? '1 chave criada com sucesso!' : `${qty} chaves criadas com sucesso!`);
    }
  } finally {
    button.disabled = false;
    onQtyChange();
  }
}

function copyCreatedKeys() {
  if (!_lastCreatedKeys.length) { toast('Nenhuma chave gerada.', true); return; }
  navigator.clipboard.writeText(_lastCreatedKeys.join('\n')).then(() => {
    toast(`${_lastCreatedKeys.length} chave${_lastCreatedKeys.length > 1 ? 's' : ''} copiada${_lastCreatedKeys.length > 1 ? 's' : ''}!`);
  }).catch(() => {
    toast('Erro ao copiar.', true);
  });
  _lastCreatedKeys = [];
  const btnCopy = document.getElementById('btnCopyCreated');
  if (btnCopy) btnCopy.classList.add('hidden');
}

document.getElementById('createStorePrefix').addEventListener('change', () => updateKeyPreview());
document.getElementById('createCustomPrefix').addEventListener('change', () => updateKeyPreview());
document.getElementById('createPrefix').addEventListener('input', () => updateKeyPreview());
document.getElementById('createDays').addEventListener('change', () => { updateCreateCost(); updateKeyPreview(); });
document.getElementById('createProduct').addEventListener('change', () => { updateCreateCost(); updateKeyPreview(); });
document.getElementById('createQty').addEventListener('input', () => onQtyChange());
document.getElementById('btnCreate').addEventListener('click', () => doCreate());
document.getElementById('btnCopyCreated').addEventListener('click', () => copyCreatedKeys());
