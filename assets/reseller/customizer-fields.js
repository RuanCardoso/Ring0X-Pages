(() => {
  'use strict';
  const DEFAULT_PANEL_SETTINGS = StorePanelAppearance.defaults;
    const PANEL_IDENTITY_FIELDS = [
      ['branding.displayName', 'Nome da loja', 'text', { max: 60 }],
      ['branding.pageTitle', 'Título da aba do navegador', 'text', { max: 120 }],
      ['branding.subtitle', 'Descrição no cabeçalho', 'text', { max: 160, optional: true }],
      ['branding.logoUrl', 'Endereço do logo', 'url', { optional: true }],
      ['branding.faviconUrl', 'Ícone da aba do navegador', 'url', { optional: true }],
      ['links.supportUrl', 'Link de suporte', 'url', { optional: true }],
      ['links.supportLabel', 'Texto do botão de suporte', 'text', { max: 30 }],
      ['links.loaderUrl', 'Link para baixar o loader', 'url', {}],
      ['links.loaderLabel', 'Texto do botão de download', 'text', { max: 40 }]
    ];
    const PANEL_MAIN_COLORS = [
      ['brand', 'Cor da marca'], ['brandContent', 'Texto dos botões principais'],
      ['base200', 'Fundo da página'], ['base100', 'Cards e cabeçalho'],
      ['base300', 'Barra lateral'], ['baseContent', 'Texto do painel'],
      ['neutral', 'Botões secundários'], ['neutralContent', 'Texto dos botões secundários']
    ];
    const PANEL_EXTRA_COLORS = [
      ['success', 'Sucesso'], ['successContent', 'Texto sobre sucesso'],
      ['warning', 'Avisos'], ['warningContent', 'Texto sobre avisos'],
      ['error', 'Erros e exclusões'], ['errorContent', 'Texto sobre erros'],
      ['info', 'Informações'], ['infoContent', 'Texto sobre informações'],
      ['primary', 'Ação alternativa'], ['primaryContent', 'Texto da ação alternativa'],
      ['secondary', 'Cor secundária'], ['secondaryContent', 'Texto sobre cor secundária'],
      ['accent', 'Destaque auxiliar'], ['accentContent', 'Texto sobre destaque auxiliar']
    ];
    const PANEL_FONT_OPTIONS = [
      ['Inter, sans-serif', 'Inter'], ['Space Grotesk, sans-serif', 'Space Grotesk'],
      ['Arial, sans-serif', 'Arial'], ['Georgia, serif', 'Georgia']
    ];
    const PANEL_STYLE_FIELDS = [
      ['appearance.fonts.body', 'Fonte do texto', 'select', { options: PANEL_FONT_OPTIONS }],
      ['appearance.fonts.heading', 'Fonte dos títulos', 'select', { options: PANEL_FONT_OPTIONS }],
      ['appearance.radii.box', 'Cantos dos cards', 'range', { min: 0, max: 96, unit: 'px' }],
      ['appearance.radii.button', 'Cantos dos botões', 'range', { min: 0, max: 96, unit: 'px' }],
      ['appearance.layout.contentMaxWidth', 'Largura do conteúdo', 'range', { min: 50, max: 100, unit: '%' }],
      ['appearance.layout.pagePaddingDesktop', 'Espaço nas bordas', 'range', { min: 0, max: 64, unit: 'px' }]
    ];
    const PANEL_EXTRA_STYLE_FIELDS = [
      ['appearance.fonts.mono', 'Fonte das chaves', 'select', { options: [
        ['JetBrains Mono, monospace', 'JetBrains Mono'], ['Consolas, monospace', 'Consolas'], ['Courier New, monospace', 'Courier New']
      ] }],
      ['appearance.colorScheme', 'Controles do navegador', 'select', { options: [['dark', 'Escuros'], ['light', 'Claros']] }],
      ...[['input', 'Cantos dos campos'], ['badge', 'Cantos dos indicadores'], ['tab', 'Cantos das abas'],
        ['table', 'Cantos da tabela'], ['mobileTableRow', 'Cantos das linhas no celular']]
        .map(([field, label]) => ['appearance.radii.' + field, label, 'range', { min: 0, max: 96, unit: 'px' }]),
      ['appearance.layout.sidebarWidth', 'Largura da barra lateral', 'range', { min: 160, max: 480, unit: 'px' }],
      ...[['pagePaddingMobile', 'Bordas da página no celular', 32], ['cardPaddingDesktop', 'Espaço dentro dos cards', 64],
        ['cardPaddingMobile', 'Espaço nos cards no celular', 32]]
        .map(([field, label, max]) => ['appearance.layout.' + field, label, 'range', { min: 0, max, unit: 'px' }]),
      ['appearance.layout.tableMaxHeight', 'Altura máxima das listas', 'range', { min: 20, max: 90, unit: 'vh' }],
      ...[['buttonWidth', 'Borda dos botões'], ['tabWidth', 'Borda das abas']]
        .map(([field, label]) => ['appearance.borders.' + field, label, 'range', { min: 0, max: 4, unit: 'px' }]),
      ...[['textSecondary', 'Visibilidade do texto secundário'], ['textMuted', 'Visibilidade do texto discreto'],
        ['textSubtle', 'Visibilidade do texto auxiliar'], ['textDisabled', 'Visibilidade do texto desabilitado'],
        ['border', 'Visibilidade das bordas'], ['borderStrong', 'Visibilidade das bordas fortes'],
        ['tableDivider', 'Separadores da tabela'], ['tableRowHover', 'Destaque ao passar o mouse'],
        ['tableRowSelected', 'Fundo da seleção'], ['tableRowSelectedRing', 'Borda da seleção']]
        .map(([field, label]) => ['appearance.opacity.' + field, label, 'range', { min: 0, max: 100, scale: 100 }]),
      ...[['buttonAnimationDuration', 'Animação dos botões'], ['inputAnimationDuration', 'Animação dos campos']]
        .map(([field, label]) => ['appearance.effects.' + field, label, 'range', { min: 0, max: 2000, step: 50, unit: 'ms' }]),
      ['appearance.effects.buttonFocusScale', 'Escala ao pressionar botões', 'range', { min: 80, max: 100, scale: 100 }],
      ['appearance.effects.cardShadow', 'Sombra dos cards', 'select', { options: [
        [DEFAULT_PANEL_SETTINGS.appearance.effects.cardShadow, 'Padrão'],
        ['0 4px 12px 0 rgb(0 0 0 / 0.1)', 'Suave'], ['none', 'Sem sombra']
      ] }]
    ];


  window.StorePanelCustomizerFields = Object.freeze({
    identity: PANEL_IDENTITY_FIELDS, mainColors: PANEL_MAIN_COLORS,
    extraColors: PANEL_EXTRA_COLORS, style: PANEL_STYLE_FIELDS,
    extraStyle: PANEL_EXTRA_STYLE_FIELDS
  });
})();
