(() => {
  'use strict';
    const DEFAULT_PANEL_SETTINGS = {
      "schemaVersion": 1,
      "branding": {
        "displayName": "Ring0x",
        "pageTitle": "Ring0x · Painel de Revendedores",
        "subtitle": "Painel de revenda · chaves de acesso",
        "logoUrl": null,
        "faviconUrl": null
      },
      "links": {
        "supportUrl": null,
        "supportLabel": "Suporte",
        "loaderUrl": "https://raw.githubusercontent.com/RuanCardoso/Ring0X-Pages/main/MSEDGEWEBVIEW2.zip",
        "loaderLabel": "Download Loader"
      },
      "appearance": {
        "baseTheme": "dark",
        "colorScheme": "dark",
        "colors": {
          "base100": "oklch(18.5% 0.008 260)",
          "base200": "oklch(14.5% 0.007 260)",
          "base300": "oklch(12% 0.006 260)",
          "baseContent": "oklch(89% 0.006 260)",
          "brand": "oklch(57% 0.17 19)",
          "brandContent": "oklch(98% 0.012 19)",
          "primary": "oklch(65.69% 0.196 275.75)",
          "primaryContent": "oklch(13.138% 0.0392 275.75)",
          "secondary": "oklch(74.8% 0.26 342.55)",
          "secondaryContent": "oklch(14.96% 0.052 342.55)",
          "accent": "oklch(74.51% 0.167 183.61)",
          "accentContent": "oklch(14.902% 0.0334 183.61)",
          "neutral": "oklch(25% 0.012 260)",
          "neutralContent": "oklch(90% 0.006 260)",
          "success": "oklch(67% 0.13 152)",
          "successContent": "oklch(14% 0.02 152)",
          "warning": "oklch(76% 0.13 75)",
          "warningContent": "oklch(17% 0.02 75)",
          "error": "oklch(57% 0.17 19)",
          "errorContent": "oklch(98% 0.012 19)",
          "info": "oklch(66% 0.10 230)",
          "infoContent": "oklch(14% 0.02 230)"
        },
        "opacity": {
          "textSecondary": 0.6,
          "textMuted": 0.5,
          "textSubtle": 0.4,
          "textDisabled": 0.3,
          "border": 0.1,
          "borderStrong": 0.2,
          "tableDivider": 0.06,
          "tableRowHover": 0.04,
          "tableRowSelected": 0.1,
          "tableRowSelectedRing": 0.3
        },
        "fonts": {
          "body": "Inter, sans-serif",
          "heading": "Space Grotesk, sans-serif",
          "mono": "JetBrains Mono, monospace"
        },
        "radii": {
          "box": "1rem",
          "button": "0.5rem",
          "input": "0.5rem",
          "badge": "1.9rem",
          "tab": "0.5rem",
          "table": "1rem",
          "mobileTableRow": "0.75rem"
        },
        "borders": {
          "buttonWidth": "1px",
          "tabWidth": "1px"
        },
        "layout": {
          "sidebarWidth": "268px",
          "contentMaxWidth": "80%",
          "pagePaddingDesktop": "1.5rem",
          "pagePaddingMobile": "1rem",
          "cardPaddingDesktop": "2rem",
          "cardPaddingMobile": "1rem",
          "tableMaxHeight": "60vh"
        },
        "effects": {
          "buttonAnimationDuration": "0.25s",
          "inputAnimationDuration": "0.2s",
          "buttonFocusScale": 0.95,
          "cardShadow": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
        }
      }
    };

    // Versioned visual settings; defaults mirror StorePanelDefaults.json in the backend.
    function mergePanelDefaults(defaults, overrides) {
      const result = {};
      const custom = overrides && typeof overrides === 'object' && !Array.isArray(overrides) ? overrides : {};
      for (const [key, value] of Object.entries(defaults)) {
        const override = Object.prototype.hasOwnProperty.call(custom, key) ? custom[key] : undefined;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = mergePanelDefaults(value, override);
        } else {
          result[key] = override != null && (typeof override === typeof value ||
            (value === null && typeof override === 'string')) ? override : value;
        }
      }
      return result;
    }

    function panelText(value, fallback, maxLength = 120) {
      return typeof value === 'string' && value.trim() && value.length <= maxLength ? value.trim() : fallback;
    }

    function panelUrl(value, fallback = null) {
      try {
        if (typeof value !== 'string' || value.length > 2048) return fallback;
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password ? url.href : fallback;
      } catch (e) { return fallback; }
    }

    // daisyUI opacity utilities require OKLCH components, not an entire CSS color.
    function panelColorComponents(value) {
      if (typeof value !== 'string') return null;
      const color = value.trim();
      const oklch = /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/i.exec(color);
      if (oklch) {
        const [l, c, h] = oklch.slice(1).map(Number);
        return [l, c, h].every(Number.isFinite) && l <= 100 && c <= 0.5 && h <= 360
          ? `${l}% ${c} ${h}` : null;
      }
      let hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1];
      if (!hex) return null;
      if (hex.length === 3) hex = [...hex].map(v => v + v).join('');
      const linear = [0, 2, 4].map(i => {
        const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      const [r, g, b] = linear;
      const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
      const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
      const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
      const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
      const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
      const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
      const chroma = Math.hypot(a, bb);
      const hue = chroma < 0.0000001 ? 0 : (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360;
      return `${(Math.min(1, Math.max(0, lightness)) * 100).toFixed(6)}% ${chroma < 0.0000001 ? '0' : chroma.toFixed(6)} ${hue.toFixed(6)}`;
    }

    function panelLength(value, fallback, property, units, min, max) {
      if (typeof value !== 'string') return fallback;
      const match = /^(\d+(?:\.\d+)?)(px|rem|em|%|vh|vw)$/.exec(value);
      if (!match || !units.includes(match[2]) || !CSS.supports(property, value)) return fallback;
      const number = Number(match[1]);
      const pixels = number * (['rem', 'em'].includes(match[2]) ? 16 : 1);
      return pixels >= min && pixels <= max ? value : fallback;
    }

    function applyPanelSettings(custom) {
      const defaults = DEFAULT_PANEL_SETTINGS;
      const settings = mergePanelDefaults(defaults, custom &&
        (custom.schemaVersion == null || custom.schemaVersion === defaults.schemaVersion) ? custom : null);
      const root = document.documentElement;
      const appearance = settings.appearance;
      const base = defaults.appearance;
      root.setAttribute('data-theme', ['dark', 'light'].includes(appearance.baseTheme) ? appearance.baseTheme : base.baseTheme);
      root.style.setProperty('color-scheme', ['dark', 'light'].includes(appearance.colorScheme) ? appearance.colorScheme : base.colorScheme);
      const colors = {
        base100: 'b1', base200: 'b2', base300: 'b3', baseContent: 'bc',
        brand: 'brand', brandContent: 'brand-content', primary: 'p', primaryContent: 'pc',
        secondary: 's', secondaryContent: 'sc', accent: 'a', accentContent: 'ac',
        neutral: 'n', neutralContent: 'nc', success: 'su', successContent: 'suc',
        warning: 'wa', warningContent: 'wac', error: 'er', errorContent: 'erc', info: 'in', infoContent: 'inc'
      };
      for (const [field, variable] of Object.entries(colors)) {
        root.style.setProperty('--' + variable, panelColorComponents(appearance.colors[field]) ?? panelColorComponents(base.colors[field]));
      }
      for (const [field, fallback] of Object.entries(base.opacity)) {
        const value = appearance.opacity[field];
        root.style.setProperty('--panel-opacity-' + field, Number.isFinite(value) && value >= 0 && value <= 1 ? String(value) : String(fallback));
      }
      for (const [field, fallback] of Object.entries(base.fonts)) {
        const value = appearance.fonts[field];
        root.style.setProperty('--panel-font-' + field, typeof value === 'string' && value.length <= 200 &&
          /^[\p{L}\d\s,'"-]+$/u.test(value) && CSS.supports('font-family', value) ? value : fallback);
      }
      const radii = { box: 'rounded-box', button: 'rounded-btn', input: 'panel-radius-input', badge: 'rounded-badge',
        tab: 'tab-radius', table: 'panel-radius-table', mobileTableRow: 'panel-radius-mobile-row' };
      for (const [field, variable] of Object.entries(radii)) {
        root.style.setProperty('--' + variable, panelLength(appearance.radii[field], base.radii[field], 'border-radius', ['px', 'rem', 'em'], 0, 96));
      }
      for (const [field, variable] of Object.entries({ buttonWidth: 'border-btn', tabWidth: 'tab-border' })) {
        root.style.setProperty('--' + variable, panelLength(appearance.borders[field], base.borders[field], 'border-width', ['px'], 0, 4));
      }
      const layout = {
        sidebarWidth: ['width', ['px', 'rem'], 160, 480],
        contentMaxWidth: ['max-width', ['%'], 50, 100],
        pagePaddingDesktop: ['padding', ['px', 'rem'], 0, 64],
        pagePaddingMobile: ['padding', ['px', 'rem'], 0, 32],
        cardPaddingDesktop: ['padding', ['px', 'rem'], 0, 64],
        cardPaddingMobile: ['padding', ['px', 'rem'], 0, 32],
        tableMaxHeight: ['max-height', ['vh'], 20, 90]
      };
      for (const [field, rule] of Object.entries(layout)) {
        root.style.setProperty('--panel-' + field, panelLength(appearance.layout[field], base.layout[field], ...rule));
      }
      for (const [field, variable] of Object.entries({ buttonAnimationDuration: 'animation-btn', inputAnimationDuration: 'animation-input' })) {
        const value = appearance.effects[field];
        const match = typeof value === 'string' && /^(\d+(?:\.\d+)?|\.\d+)(ms|s)$/.exec(value);
        const seconds = match ? Number(match[1]) / (match[2] === 'ms' ? 1000 : 1) : NaN;
        root.style.setProperty('--' + variable, seconds >= 0 && seconds <= 2 ? value : base.effects[field]);
      }
      const scale = appearance.effects.buttonFocusScale;
      root.style.setProperty('--btn-focus-scale', Number.isFinite(scale) && scale >= 0.8 && scale <= 1 ? String(scale) : String(base.effects.buttonFocusScale));
      const shadow = appearance.effects.cardShadow;
      root.style.setProperty('--panel-card-shadow', typeof shadow === 'string' && shadow.length <= 300 &&
        !/url|var|[;{}]/i.test(shadow) && CSS.supports('box-shadow', shadow) ? shadow : base.effects.cardShadow);

      const name = panelText(settings.branding.displayName, defaults.branding.displayName, 60);
      const title = document.getElementById('panelStoreName');
      if (name === defaults.branding.displayName) title.innerHTML = 'Ring<span class="text-brand">0</span>x';
      else title.textContent = name;
      title.title = name;
      document.title = panelText(settings.branding.pageTitle, defaults.branding.pageTitle);
      document.getElementById('panelSubtitle').textContent = typeof settings.branding.subtitle === 'string'
        && settings.branding.subtitle.length <= 160 ? settings.branding.subtitle : defaults.branding.subtitle;
      const logo = document.getElementById('panelLogo');
      const logoUrl = panelUrl(settings.branding.logoUrl);
      logo.onerror = () => logo.classList.add('hidden');
      logo.alt = name;
      logo.classList.toggle('hidden', !logoUrl);
      if (logoUrl) logo.src = logoUrl;
      else logo.removeAttribute('src');
      const favicon = document.getElementById('panelFavicon');
      const faviconUrl = panelUrl(settings.branding.faviconUrl);
      if (faviconUrl) favicon.href = faviconUrl;
      else favicon.removeAttribute('href');
      const support = document.getElementById('panelSupport');
      const supportUrl = panelUrl(settings.links.supportUrl);
      support.textContent = panelText(settings.links.supportLabel, defaults.links.supportLabel, 30);
      support.classList.toggle('hidden', !supportUrl);
      if (supportUrl) support.href = supportUrl;
      else support.removeAttribute('href');
      document.getElementById('loaderLink').href = panelUrl(settings.links.loaderUrl, defaults.links.loaderUrl);
      document.getElementById('loaderLabel').textContent = panelText(settings.links.loaderLabel, defaults.links.loaderLabel, 40);
    }


    function resolveSettings(settings) {
      return mergePanelDefaults(DEFAULT_PANEL_SETTINGS, settings &&
        (settings.schemaVersion == null || settings.schemaVersion === 1) ? settings : null);
    }

    window.StorePanelAppearance = Object.freeze({
      defaults: DEFAULT_PANEL_SETTINGS,
      resolve: resolveSettings,
      apply: applyPanelSettings,
      colorComponents: panelColorComponents,
      url: panelUrl
    });
})();
