function getHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const t = (document.getElementById('token').value || '').trim();
  if (t) h['Authorization'] = 'Bearer ' + t;
  return h;
}

function getBase() {
  return 'https://ringapi.guaranihub.com';
}

async function api(path, body) {
  const r = await fetch(getBase() + path, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify(body)
  });
  const ct = r.headers.get('content-type') || '';
  const d = ct.includes('application/json') ? await r.json() : await r.text();
  if (!r.ok) {
    const m = typeof d === 'string' ? d : d?.StatusMessage || JSON.stringify(d);
    throw new Error(`HTTP ${r.status}: ${m}`);
  }
  if (d && d.StatusCode && d.StatusCode !== 200) {
    throw new Error(d.StatusMessage || `Erro ${d.StatusCode}`);
  }
  return d;
}
