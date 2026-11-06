tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: 'oklch(var(--brand) / <alpha-value>)',
        'brand-content': 'oklch(var(--brand-content) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['var(--panel-font-body)'],
        mono: ['var(--panel-font-mono)'],
        display: ['var(--panel-font-heading)'],
      }
    }
  }
}
