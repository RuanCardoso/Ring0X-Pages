let PRICES = {};
const PRICE_DURATIONS = { 1: 'diaria', 7: 'semanal', 30: 'mensal', 90: 'trimestral', 365: 'anual' };
let _calcQty = 1;
let _calcProduct = 'PUBG';

const PRODUCT_META = {
  PB: { label: 'PB' },
  FAIRLIGHT: { label: 'Fairlight' },
  PUBG: { label: 'PUBG - Full' },
  PUBGESP: { label: 'PUBG - ESP' },
  PUBGMACRO: { label: 'PUBG - Macro' }
};


function applyStoreConfiguration(store) {
  if (!store?.fingerprint || !store.productPrices) {
    throw new Error('O servidor não retornou os preços da loja.');
  }
  const prices = {};
  for (const product of Object.keys(PRODUCT_META)) {
    prices[product] = {};
    for (const [days, label] of Object.entries(PRICE_DURATIONS)) {
      const value = store.productPrices[product]?.[days];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
          value > 99999999.99 || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) {
        throw new Error(`Preço inválido ou ausente para ${productLabel(product)} (${days} dias).`);
      }
      prices[product][label] = value;
    }
  }
  PRICES = prices;
  StorePanelCustomizer.commit(store.panelSettings);
  updateCalc();
  updateCreateCost();
}

/* enum numérico da API + códigos string */
const PRODUCT_CODES = {
  0: 'PB', 1: 'FAIRLIGHT', 2: 'PUBG', 3: 'PUBGESP', 4: 'PUBGMACRO',
  PB: 'PB', FAIRLIGHT: 'FAIRLIGHT', PUBG: 'PUBG',
  PUBGESP: 'PUBGESP', PUBGMACRO: 'PUBGMACRO',
  'PUBG - Full': 'PUBG', 'PUBG - ESP': 'PUBGESP', 'PUBG - Macro': 'PUBGMACRO'
};

function resolveProductCode(pt) {
  if (pt === null || pt === undefined || pt === '') return null;
  if (PRODUCT_CODES[pt] !== undefined) return PRODUCT_CODES[pt];
  return String(pt);
}

function productLabel(code) {
  return PRODUCT_META[code]?.label || code || '—';
}

function fmt(v) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function setCalcProduct(p) {
  _calcProduct = p;
  updateCalc();
}

function updateCalc() {
  const p = PRICES[_calcProduct];
  document.getElementById('calcQtyVal').textContent = _calcQty;
  for (const label of Object.values(PRICE_DURATIONS)) {
    const suffix = label[0].toUpperCase() + label.slice(1);
    document.getElementById('calc' + suffix).textContent = p ? fmt(p[label] * _calcQty) : '—';
    document.getElementById('price' + suffix).textContent = p ? fmt(p[label]) : '—';
  }
}

function changeQty(d) {
  _calcQty = Math.max(1, Math.min(999, _calcQty + d));
  updateCalc();
}

document.getElementById('prodSelect').addEventListener('change', event => setCalcProduct(event.currentTarget.value));
document.getElementById('btnCalcDecrease').addEventListener('click', () => changeQty(-1));
document.getElementById('btnCalcIncrease').addEventListener('click', () => changeQty(1));
