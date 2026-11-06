let _debtCountdownInterval = null;
let _debtBalanceRevision = 0;

function stopDebtCountdown() {
  if (_debtCountdownInterval !== null) clearInterval(_debtCountdownInterval);
  _debtCountdownInterval = null;
  document.getElementById('debtDeadlineWrap').classList.add('hidden');
}

function startDebtCountdown(secondsUntilOverdue, isOverdue) {
  stopDebtCountdown();
  if (secondsUntilOverdue == null) return;
  const seconds = Number(secondsUntilOverdue);
  if (!Number.isFinite(seconds)) return;

  const wrap = document.getElementById('debtDeadlineWrap');
  const countdown = document.getElementById('debtCountdown');
  wrap.classList.remove('hidden');
  if (isOverdue || seconds <= 0) {
    countdown.textContent = 'Prazo vencido';
    countdown.classList.replace('text-warning', 'text-error');
    if (!isOverdue && document.getElementById('token').value.trim()) {
      setTimeout(loadDebtBalance, 2000);
    }
    return;
  }

  countdown.classList.replace('text-error', 'text-warning');
  const deadline = performance.now() + seconds * 1000;
  function update() {
    const remaining = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    if (remaining === 0) {
      countdown.textContent = 'Prazo vencido';
      countdown.classList.replace('text-warning', 'text-error');
      document.getElementById('debtStatusLabel').textContent = 'Débito vencido!';
      clearInterval(_debtCountdownInterval);
      _debtCountdownInterval = null;
      setTimeout(() => {
        if (document.getElementById('token').value.trim()) loadDebtBalance();
      }, 2000);
      return;
    }
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const secs = remaining % 60;
    countdown.textContent = `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  _debtCountdownInterval = setInterval(update, 1000);
  update();
}

async function loadDebtBalance() {
  const btn = document.getElementById('btnPayDebt');
  const val = document.getElementById('debtValue');
  const lbl = document.getElementById('debtStatusLabel');

  if (!btn || !val || !lbl) return;

  const revision = ++_debtBalanceRevision;

  document.getElementById('qrWrap').classList.add('hidden');

  if (!document.getElementById('token').value.trim()) {
    stopDebtCountdown();
    lbl.textContent = 'Sem token';
    val.textContent = 'R$ 0,00';
    btn.disabled = true;
    return;
  }

  try {
    lbl.textContent = 'Consultando...';
    val.classList.remove('text-error', 'text-success');
    val.classList.add('text-base-content/60');
    const res = await api('/admin/auth-keys/debt-balance', {});
    if (revision !== _debtBalanceRevision) return;
    const data = res.Result || {};
    const debt = parseFloat(data.Balance ?? data.balance) || 0;
    const isOverdue = data.IsOverdue === true || data.isOverdue === true;

    val.textContent = fmt(debt);
    if (debt > 0) startDebtCountdown(data.SecondsUntilOverdue ?? data.secondsUntilOverdue, isOverdue);
    else stopDebtCountdown();

    if (isOverdue) {
      lbl.textContent = 'Débito vencido!';
      val.classList.remove('text-base-content/60', 'text-success');
      val.classList.add('text-error');
      btn.disabled = false;
    } else if (debt > 0) {
      lbl.textContent = 'Você deve';
      val.classList.remove('text-base-content/60', 'text-success');
      val.classList.add('text-error');
      btn.disabled = false;
    } else {
      lbl.textContent = 'Tudo pago!';
      val.classList.remove('text-base-content/60', 'text-error');
      val.classList.add('text-success');
      btn.disabled = true;
    }
  } catch (e) {
    if (revision !== _debtBalanceRevision) return;
    stopDebtCountdown();
    lbl.textContent = 'Erro ao ler';
    val.textContent = 'R$ 0,00';
    val.classList.remove('text-base-content/60', 'text-success');
    val.classList.add('text-error');
    btn.disabled = true;
  }
}

function updatePixCouponButton() {
  const coupon = document.getElementById('pixCoupon').value;
  const button = document.getElementById('btnPixCoupon');
  button.textContent = coupon ? 'Cupom selecionado · Alterar' : 'Adicionar cupom';
  button.setAttribute('aria-label', coupon ? `Alterar cupom ${coupon}` : 'Adicionar cupom de desconto');
}

function openPixCouponModal() {
  if (_payMethod !== 'pix') return;
  const coupon = document.getElementById('pixCoupon').value;
  document.getElementById('pixCouponDraft').value = coupon;
  document.getElementById('btnRemovePixCoupon').classList.toggle('hidden', !coupon);
  document.getElementById('modalPixCoupon').showModal();
  document.getElementById('pixCouponDraft').focus();
}

function savePixCoupon() {
  if (_payMethod !== 'pix') return;
  const coupon = document.getElementById('pixCouponDraft').value.trim().toUpperCase();
  if (coupon && coupon.length !== 18) {
    toast('O cupom deve ter 18 caracteres.', true);
    return;
  }
  if (document.getElementById('pixCoupon').value !== coupon) {
    document.getElementById('qrWrap').classList.add('hidden');
    document.getElementById('paymentAmountSummary').classList.add('hidden');
    _lastPixCode = '';
  }
  document.getElementById('pixCoupon').value = coupon;
  updatePixCouponButton();
  document.getElementById('modalPixCoupon').close();
}

function removePixCoupon() {
  document.getElementById('pixCouponDraft').value = '';
  savePixCoupon();
}

let _payMethod = 'pix';
function setPayMethod(m) {
  _payMethod = m;
  document.getElementById('pixCoupon').disabled = m !== 'pix';
  if (m !== 'pix') document.getElementById('pixCoupon').value = '';
  updatePixCouponButton();
  if (m !== 'pix' && document.getElementById('modalPixCoupon').open) document.getElementById('modalPixCoupon').close();
  document.getElementById('paymentAmountSummary').classList.add('hidden');
  document.getElementById('qrWrap').classList.add('hidden');
  _lastPixCode = '';
  const pixBtn = document.getElementById('btnMethodPix');
  const creditBtn = document.getElementById('btnMethodCredit');
  const cpfWrap = document.getElementById('cpfWrap');

  if (m === 'pix') {
    pixBtn.classList.remove('btn-neutral');
    pixBtn.classList.add('btn-brand');
    creditBtn.classList.remove('btn-brand');
    creditBtn.classList.add('btn-neutral');
    cpfWrap.classList.remove('hidden');
  } else {
    creditBtn.classList.remove('btn-neutral');
    creditBtn.classList.add('btn-brand');
    pixBtn.classList.remove('btn-brand');
    pixBtn.classList.add('btn-neutral');
    cpfWrap.classList.add('hidden');
  }
}

let _lastPixCode = '';
function copyPixCode() {
  if (!_lastPixCode) return;
  navigator.clipboard.writeText(_lastPixCode).then(() => {
    toast("Código PIX copiado!");
  }).catch(() => {
    prompt("Copie o código PIX abaixo:", _lastPixCode);
  });
}

async function doPayDebt() {
  if (document.getElementById('btnPayDebt').disabled) return;
  const method = _payMethod;
  let doc = '';
  const body = { paymentMethod: method, cpf: doc };
  if (method === 'pix') {
    doc = document.getElementById('pixCpf').value.trim().replace(/\D/g, '');
    if (!doc || doc.length < 11) {
      toast('Digite seu CPF para emitir o PIX.', true);
      return;
    }
    body.cpf = doc;
    body.cupom = document.getElementById('pixCoupon').value.trim().toUpperCase();
  }
  const tokenAtStart = document.getElementById('token').value;
  const isCurrent = () => document.getElementById('token').value === tokenAtStart && _payMethod === method;
  document.getElementById('qrWrap').classList.add('hidden');
  document.getElementById('paymentAmountSummary').classList.add('hidden');
  _lastPixCode = '';
  setLoading('btnPayDebt', true);
  try {
    const res = await api('/api/gateway/pay-debt', body);
    if (!isCurrent()) return;
    const data = res?.Result;
    const type = data?.type || data?.Type;
    const raw = data?.raw || data?.Raw;

    if (raw) {
      const total = Number(data.totalAmount ?? data.TotalAmount);
      const discount = Number(data.discountAmount ?? data.DiscountAmount);
      if (Number.isFinite(total) && total > 0) {
        const summary = document.getElementById('paymentAmountSummary');
        summary.textContent = Number.isFinite(discount) && discount > 0
          ? `Desconto: ${fmt(discount)} · Total a pagar: ${fmt(total)}`
          : `Total a pagar: ${fmt(total)}`;
        summary.classList.remove('hidden');
      }
      if (type === 'qr') {
        _lastPixCode = raw;
        document.getElementById('qrWrap').classList.remove('hidden');
        document.getElementById('qrImg').innerHTML = '';
        new QRCode(document.getElementById("qrImg"), {
          text: raw,
          width: 180,
          height: 180,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } else {
        window.open(raw, '_blank');
        toast("Sessão de pagamento criada! Finalize na aba que se abriu.");
      }
    } else {
      toast("Gateway não retornou URL/QR Code.", true);
    }
  } catch (e) {
    if (isCurrent()) toast("Erro: " + e.message, true);
  } finally {
    setLoading('btnPayDebt', false);
  }
}

document.getElementById('btnMethodPix').addEventListener('click', () => setPayMethod('pix'));
document.getElementById('btnMethodCredit').addEventListener('click', () => setPayMethod('credit'));
document.getElementById('btnPixCoupon').addEventListener('click', () => openPixCouponModal());
document.getElementById('btnPayDebt').addEventListener('click', () => doPayDebt());
document.getElementById('btnCopyPix').addEventListener('click', () => copyPixCode());
document.getElementById('modalPixCoupon').addEventListener('close', () => document.getElementById('pixCouponDraft').value = '');
document.getElementById('pixCouponForm').addEventListener('submit', event => { event.preventDefault(); savePixCoupon(); });
document.getElementById('btnRemovePixCoupon').addEventListener('click', () => removePixCoupon());
document.getElementById('btnCancelPixCoupon').addEventListener('click', () => document.getElementById('modalPixCoupon').close());
