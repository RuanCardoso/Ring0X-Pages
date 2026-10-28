(() => {
  'use strict';
    const DEFAULT_PANEL_SETTINGS = StorePanelAppearance.defaults;
    const applyPanelSettings = StorePanelAppearance.apply;
    const panelColorComponents = StorePanelAppearance.colorComponents;
    const panelUrl = StorePanelAppearance.url;
    const { identity: PANEL_IDENTITY_FIELDS, mainColors: PANEL_MAIN_COLORS,
      extraColors: PANEL_EXTRA_COLORS, style: PANEL_STYLE_FIELDS,
      extraStyle: PANEL_EXTRA_STYLE_FIELDS } = StorePanelCustomizerFields;
    let _savedPanelSettings = StorePanelAppearance.resolve(null);
    let _panelEditorSession = null;
    let _panelEditorRequest = null;

    function clonePanelSettings(settings) { return JSON.parse(JSON.stringify(settings)); }
    function panelSettingAt(settings, path) { return path.split('.').reduce((value, key) => value[key], settings); }
    function setPanelSetting(settings, path, value) {
      const parts = path.split('.');
      const key = parts.pop();
      parts.reduce((parent, part) => parent[part], settings)[key] = value;
    }

    function commitPanelSettings(settings) {
      _savedPanelSettings = StorePanelAppearance.resolve(settings);
      applyPanelSettings(_savedPanelSettings);
    }

    function panelColorHex(value) {
      const components = panelColorComponents(value);
      if (!components) return null;
      const [lightness, chroma, hue] = components.match(/[\d.]+/g).map(Number);
      const L = lightness / 100;
      const a = chroma * Math.cos(hue * Math.PI / 180);
      const b = chroma * Math.sin(hue * Math.PI / 180);
      const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
      const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
      const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
      const linear = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
      return '#' + linear.map(channel => {
        const v = channel <= 0.0031308 ? channel * 12.92 : 1.055 * Math.max(0, channel) ** (1 / 2.4) - 0.055;
        return Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
      }).join('');
    }

    function panelRangeNumber(value, options) {
      if (options.scale) return typeof value === 'number' ? value * options.scale : NaN;
      if (typeof value !== 'string') return NaN;
      const match = /^(\d+(?:\.\d+)?|\.\d+)(px|rem|em|%|vh|ms|s)$/.exec(value);
      if (!match) return NaN;
      const unit = match[2];
      if (options.unit === 'px' && !['px', 'rem', 'em'].includes(unit)) return NaN;
      if (options.unit === 'ms' && !['ms', 's'].includes(unit)) return NaN;
      if (['%', 'vh'].includes(options.unit) && unit !== options.unit) return NaN;
      return Number(match[1]) * (['rem', 'em'].includes(unit) ? 16 : unit === 's' ? 1000 : 1);
    }

    function showPanelEditorError(message) {
      const error = document.getElementById('panelEditorError');
      error.textContent = message || '';
      error.classList.toggle('hidden', !message);
    }

    function createPanelEditorField(descriptor) {
      const [path, label, kind, options = {}] = descriptor;
      const session = _panelEditorSession;
      let value = panelSettingAt(session.draft, path);
      const fallback = panelSettingAt(DEFAULT_PANEL_SETTINGS, path);
      const wrapper = document.createElement('div');
      wrapper.className = 'form-control min-w-0';
      const labelElement = document.createElement('label');
      labelElement.className = 'label gap-2';
      const id = 'panelField-' + path.replaceAll('.', '-');
      labelElement.htmlFor = id;
      const caption = document.createElement('span');
      caption.className = 'label-text text-xs'; caption.textContent = label;
      labelElement.appendChild(caption);
      const output = document.createElement('span');
      output.className = 'mono text-[10px] text-base-content/50 shrink-0';
      const input = document.createElement(kind === 'select' ? 'select' : 'input');
      input.id = id;
      if (kind !== 'select') input.type = kind === 'color' ? 'color' : kind === 'range' ? 'range' : kind;
      input.className = kind === 'select' ? 'select select-bordered select-sm w-full' :
        kind === 'range' ? 'range range-sm' : 'input input-bordered input-sm w-full';
      if (kind === 'select') {
        const choices = [...options.options];
        if (!choices.some(([key]) => key === value)) choices.push([value, 'Atual: ' + value]);
        choices.forEach(([key, title]) => { const option = document.createElement('option'); option.value = key; option.textContent = title; input.appendChild(option); });
        input.value = value;
      } else if (kind === 'color') {
        if (!panelColorComponents(value)) { value = fallback; setPanelSetting(session.draft, path, value); }
        input.value = panelColorHex(value);
        output.textContent = input.value.toUpperCase(); labelElement.appendChild(output);
      } else if (kind === 'range') {
        let number = panelRangeNumber(value, options);
        if (!Number.isFinite(number) || number < options.min || number > options.max) {
          number = panelRangeNumber(fallback, options); setPanelSetting(session.draft, path, fallback);
        }
        input.min = options.min; input.max = options.max; input.step = options.step || 1; input.value = number;
        output.textContent = Math.round(number) + (options.scale ? '%' : options.unit);
        labelElement.appendChild(output);
      } else {
        if (kind === 'url' && value && !panelUrl(value)) { value = fallback; setPanelSetting(session.draft, path, value); }
        input.value = value ?? '';
        input.required = !options.optional;
        input.maxLength = kind === 'url' ? 2048 : options.max;
        if (kind === 'url') input.placeholder = options.optional ? 'Opcional · https://...' : 'https://...';
      }
      input.addEventListener(kind === 'select' ? 'change' : 'input', () => {
        if (_panelEditorSession !== session || _panelEditorRequest) return;
        let next = input.value;
        input.setCustomValidity('');
        if (kind === 'range') {
          const number = Number(next);
          next = options.scale ? number / options.scale : next + options.unit;
          output.textContent = Math.round(number) + (options.scale ? '%' : options.unit);
        } else if (kind === 'url') {
          next = next.trim();
          if (next && !panelUrl(next)) input.setCustomValidity('Informe um endereço HTTPS válido, sem usuário ou senha.');
          if (!next && options.optional) next = null;
        } else if (kind === 'text') {
          next = next.trim();
          if (!next && !options.optional) input.setCustomValidity('Preencha este campo.');
        } else if (kind === 'color') output.textContent = next.toUpperCase();
        if (path === 'branding.displayName' && session.draft.branding.pageTitle === panelSettingAt(session.draft, 'branding.displayName') + ' · Painel de Revendedores') {
          session.draft.branding.pageTitle = next + ' · Painel de Revendedores';
          const titleInput = document.getElementById('panelField-branding-pageTitle');
          if (titleInput) titleInput.value = session.draft.branding.pageTitle;
        }
        setPanelSetting(session.draft, path, next);
        if (path === 'appearance.colorScheme') session.draft.appearance.baseTheme = next;
        showPanelEditorError('');
        document.getElementById('panelEditorStatus').textContent = 'Prévia atualizada. Clique em Salvar aparência para aplicar.';
        renderPanelPreview();
      });
      wrapper.appendChild(labelElement); wrapper.appendChild(input);
      return wrapper;
    }

    function fillPanelEditor() {
      const colors = fields => fields.map(([field, label]) => ['appearance.colors.' + field, label, 'color', {}]);
      for (const [id, fields] of [
        ['panelEditorIdentity', PANEL_IDENTITY_FIELDS], ['panelEditorColors', colors(PANEL_MAIN_COLORS)],
        ['panelEditorExtraColors', colors(PANEL_EXTRA_COLORS)], ['panelEditorStyle', PANEL_STYLE_FIELDS],
        ['panelEditorExtraStyle', PANEL_EXTRA_STYLE_FIELDS]
      ]) {
        const container = document.getElementById(id); container.replaceChildren();
        fields.forEach(field => container.appendChild(createPanelEditorField(field)));
      }
      renderPanelPreview();
    }

    function renderPanelPreview() {
      if (!_panelEditorSession) return;
      const draft = _panelEditorSession.draft;
      const appearance = draft.appearance;
      const preview = document.getElementById('panelPreview');
      for (const [field, variable] of Object.entries({ base200:'page', base100:'card', base300:'sidebar', baseContent:'text',
        brand:'brand', brandContent:'brand-text', success:'success', warning:'warning', error:'error' })) {
        const value = panelColorComponents(appearance.colors[field]) ? appearance.colors[field] : DEFAULT_PANEL_SETTINGS.appearance.colors[field];
        preview.style.setProperty('--pv-' + variable, value);
      }
      preview.style.setProperty('--pv-border', `oklch(${panelColorComponents(appearance.colors.baseContent) ?? panelColorComponents(DEFAULT_PANEL_SETTINGS.appearance.colors.baseContent)} / ${appearance.opacity.border})`);
      preview.style.setProperty('--pv-font', appearance.fonts.body);
      preview.style.setProperty('--pv-heading', appearance.fonts.heading);
      preview.style.setProperty('--pv-box-radius', appearance.radii.box);
      preview.style.setProperty('--pv-button-radius', appearance.radii.button);
      preview.style.setProperty('--pv-shadow', appearance.effects.cardShadow);
      document.getElementById('panelPreviewName').textContent = draft.branding.displayName || 'Sua loja';
      document.getElementById('panelPreviewSubtitle').textContent = draft.branding.subtitle;
      const logo = document.getElementById('panelPreviewLogo');
      const url = panelUrl(draft.branding.logoUrl);
      logo.classList.toggle('hidden', !url);
      logo.onerror = () => logo.classList.add('hidden');
      if (url && logo.getAttribute('src') !== url) logo.src = url;
      else if (!url) logo.removeAttribute('src');
    }

    function switchPanelEditorTab(tab) {
      for (const id of ['identity', 'colors', 'style']) {
        document.getElementById('panelEditorTab-' + id).classList.toggle('tab-active', id === tab);
        document.getElementById('panelEditorSection-' + id).classList.toggle('hidden', id !== tab);
      }
    }

    function setPanelEditorBusy(busy) {
      document.getElementById('panelEditorFields').disabled = busy;
      ['panelEditorSave', 'panelEditorReset', 'panelEditorCancel', 'panelEditorClose'].forEach(id => { document.getElementById(id).disabled = busy; });
      document.getElementById('panelEditorSave').textContent = busy ? 'Salvando…' : 'Salvar aparência';
      document.getElementById('panelEditorForm').setAttribute('aria-busy', String(busy));
    }

    function openPanelCustomizer() {
      const current = handlers.getSession();
      const token = current.token;
      if (!token || !current.store || !handlers.isAuthenticated()) return;
      if (_panelEditorSession) return;
      _panelEditorSession = {token, fingerprint:current.store, draft:clonePanelSettings(_savedPanelSettings)};
      showPanelEditorError(''); setPanelEditorBusy(false); switchPanelEditorTab('identity'); fillPanelEditor();
      document.getElementById('panelEditorStatus').textContent = 'Personalização válida somente para esta loja.';
      document.getElementById('panelEditorDialog').showModal();
    }

    function closePanelCustomizer(force = false) {
      if (_panelEditorRequest && !force) return;
      _panelEditorSession = null;
      _panelEditorRequest = null;
      const dialog = document.getElementById('panelEditorDialog');
      if (dialog.open) dialog.close();
      setPanelEditorBusy(false);
    }

    function resetPanelDraft() {
      if (!_panelEditorSession || _panelEditorRequest) return;
      _panelEditorSession.draft = clonePanelSettings(DEFAULT_PANEL_SETTINGS);
      fillPanelEditor(); showPanelEditorError('');
      document.getElementById('panelEditorStatus').textContent = 'Padrão carregado na prévia, incluindo nome e links. Clique em Salvar aparência para confirmar.';
    }

    function usePanelPreset(name) {
      if (!_panelEditorSession || _panelEditorRequest) return;
      const presets = {
        green: {base100:'#10291D',base200:'#071A12',base300:'#091F16',baseContent:'#ECFDF5',brand:'#22C55E',brandContent:'#052E16',neutral:'#173F2B',neutralContent:'#ECFDF5'},
        blue: {base100:'#14243A',base200:'#0B1424',base300:'#0D1B2D',baseContent:'#EFF6FF',brand:'#60A5FA',brandContent:'#0B1424',neutral:'#243D5E',neutralContent:'#EFF6FF'},
        purple: {base100:'#281B38',base200:'#160F21',base300:'#1D142B',baseContent:'#FAF5FF',brand:'#C084FC',brandContent:'#28103C',neutral:'#3B2852',neutralContent:'#FAF5FF'},
        light: {base100:'#FFFFFF',base200:'#F1F5F9',base300:'#E2E8F0',baseContent:'#0F172A',brand:'#2563EB',brandContent:'#FFFFFF',neutral:'#CBD5E1',neutralContent:'#0F172A',success:'#15803D',successContent:'#FFFFFF',warning:'#92400E',warningContent:'#FFFFFF',error:'#B91C1C',errorContent:'#FFFFFF',info:'#0369A1',infoContent:'#FFFFFF'}
      };
      if (name !== 'default' && !presets[name]) return;
      _panelEditorSession.draft.appearance.colors = {...DEFAULT_PANEL_SETTINGS.appearance.colors, ...(presets[name] || {})};
      _panelEditorSession.draft.appearance.baseTheme = name === 'light' ? 'light' : 'dark';
      _panelEditorSession.draft.appearance.colorScheme = name === 'light' ? 'light' : 'dark';
      fillPanelEditor(); showPanelEditorError('');
      document.getElementById('panelEditorStatus').textContent = 'Tema carregado na prévia. Clique em Salvar aparência para aplicar.';
    }

    async function savePanelCustomization(event) {
      if (event) event.preventDefault();
      const session = _panelEditorSession;
      if (!session || _panelEditorRequest) return;
      const form = document.getElementById('panelEditorForm');
      if (!form.checkValidity()) {
        const invalid = form.querySelector('input:invalid, select:invalid');
        const section = invalid?.closest('[id^="panelEditorSection-"]');
        if (section) switchPanelEditorTab(section.id.replace('panelEditorSection-', ''));
        showPanelEditorError('Confira os campos destacados antes de salvar.');
        form.reportValidity();
        return;
      }
      if (!isCurrentSession(session)) { closePanelCustomizer(true); return; }
      const request = {session}; _panelEditorRequest = request;
      setPanelEditorBusy(true); showPanelEditorError('');
      document.getElementById('panelEditorStatus').textContent = 'Salvando aparência da loja…';
      const isCurrent = () => _panelEditorRequest === request && _panelEditorSession === session &&
        isCurrentSession(session);
      try {
        const response = await handlers.save(clonePanelSettings(session.draft));
        if (!isCurrent()) return;
        const settings = (response?.Result ?? response?.result)?.panelSettings;
        if (!settings || settings.schemaVersion !== 1 || typeof settings.appearance !== 'object') throw new Error('O servidor não confirmou a aparência salva.');
        commitPanelSettings(settings);
        closePanelCustomizer(true);
        handlers.onSaved();
      } catch (e) {
        if (!isCurrent()) return;
        showPanelEditorError(e.message || 'Não foi possível salvar. Tente novamente.');
        document.getElementById('panelEditorStatus').textContent = 'Suas alterações continuam na prévia. Você pode tentar salvar novamente.';
      } finally {
        if (_panelEditorRequest === request) { _panelEditorRequest = null; setPanelEditorBusy(false); }
      }
    }


    let handlers;
    function isCurrentSession(session) {
      const current = handlers.getSession();
      return current.token === session.token && current.store === session.fingerprint;
    }

    function resetSession() {
      closePanelCustomizer(true);
      _savedPanelSettings = StorePanelAppearance.resolve(null);
      applyPanelSettings(null);
      for (const id of ['panelEditorIdentity', 'panelEditorColors', 'panelEditorExtraColors', 'panelEditorStyle', 'panelEditorExtraStyle'])
        document.getElementById(id).replaceChildren();
      document.getElementById('panelPreviewLogo').removeAttribute('src');
      document.getElementById('panelPreviewName').textContent = '';
      document.getElementById('panelPreviewSubtitle').textContent = '';
    }

    function initialize(callbacks) {
      if (handlers) return;
      handlers = callbacks;
    document.getElementById('panelEditorDialog').addEventListener('cancel', event => { event.preventDefault(); closePanelCustomizer(); });
    document.getElementById('panelEditorDialog').addEventListener('close', () => { _panelEditorSession = null; });

    }

    window.StorePanelCustomizer = Object.freeze({
      init: initialize, open: openPanelCustomizer, close: closePanelCustomizer,
      save: savePanelCustomization, preset: usePanelPreset, resetDraft: resetPanelDraft,
      setTab: switchPanelEditorTab, commit: commitPanelSettings, resetSession
    });
})();
