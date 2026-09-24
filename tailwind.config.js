/** Design tokens carried over verbatim from the Tailwind CDN config that
 *  every legacy app page inlined. Preflight stays off: the landing and auth
 *  pages were designed against legacy.css alone, so app/globals.css applies
 *  an equivalent reset scoped to .shifa-app-shell instead. */
/** @type {import('tailwindcss').Config} */
module.exports = {
  "darkMode": "class",
  "content": [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}"
  ],
  "theme": {
    "extend": {
      "colors": {
        "text-body": "rgb(var(--c-text-body) / <alpha-value>)",
        "canvas-bg": "rgb(var(--c-canvas-bg) / <alpha-value>)",
        "tertiary-fixed": "rgb(var(--c-tertiary-fixed) / <alpha-value>)",
        "text-muted": "rgb(var(--c-text-muted) / <alpha-value>)",
        "surface-container-lowest": "rgb(var(--c-surface-container-lowest) / <alpha-value>)",
        "on-tertiary": "rgb(var(--c-on-tertiary) / <alpha-value>)",
        "error-container": "rgb(var(--c-error-container) / <alpha-value>)",
        "state-success-subtle": "rgb(var(--c-state-success-subtle) / <alpha-value>)",
        "border-focus": "rgb(var(--c-border-focus) / <alpha-value>)",
        "surface-subtle": "rgb(var(--c-surface-subtle) / <alpha-value>)",
        "surface-container-highest": "rgb(var(--c-surface-container-highest) / <alpha-value>)",
        "outline-variant": "rgb(var(--c-outline-variant) / <alpha-value>)",
        "surface-card": "rgb(var(--c-surface-card) / <alpha-value>)",
        "surface": "rgb(var(--c-surface) / <alpha-value>)",
        "inverse-primary": "rgb(var(--c-inverse-primary) / <alpha-value>)",
        "inverse-surface": "rgb(var(--c-inverse-surface) / <alpha-value>)",
        "text-heading": "rgb(var(--c-text-heading) / <alpha-value>)",
        "on-tertiary-fixed-variant": "rgb(var(--c-on-tertiary-fixed-variant) / <alpha-value>)",
        "state-info": "rgb(var(--c-state-info) / <alpha-value>)",
        "surface-dim": "rgb(var(--c-surface-dim) / <alpha-value>)",
        "on-primary-container": "rgb(var(--c-on-primary-container) / <alpha-value>)",
        "secondary-container": "rgb(var(--c-secondary-container) / <alpha-value>)",
        "primary-container": "rgb(var(--c-primary-container) / <alpha-value>)",
        "on-error": "rgb(var(--c-on-error) / <alpha-value>)",
        "outline": "rgb(var(--c-outline) / <alpha-value>)",
        "on-primary-fixed-variant": "rgb(var(--c-on-primary-fixed-variant) / <alpha-value>)",
        "secondary-fixed-dim": "rgb(var(--c-secondary-fixed-dim) / <alpha-value>)",
        "on-background": "rgb(var(--c-on-background) / <alpha-value>)",
        "on-surface": "rgb(var(--c-on-surface) / <alpha-value>)",
        "on-primary": "rgb(var(--c-on-primary) / <alpha-value>)",
        "secondary-fixed": "rgb(var(--c-secondary-fixed) / <alpha-value>)",
        "tertiary-fixed-dim": "rgb(var(--c-tertiary-fixed-dim) / <alpha-value>)",
        "tertiary-container": "rgb(var(--c-tertiary-container) / <alpha-value>)",
        "primary": "rgb(var(--c-primary) / <alpha-value>)",
        "tertiary": "rgb(var(--c-tertiary) / <alpha-value>)",
        "text-primary": "rgb(var(--c-text-primary) / <alpha-value>)",
        "state-info-subtle": "rgb(var(--c-state-info-subtle) / <alpha-value>)",
        "primary-fixed-dim": "rgb(var(--c-primary-fixed-dim) / <alpha-value>)",
        "on-tertiary-fixed": "rgb(var(--c-on-tertiary-fixed) / <alpha-value>)",
        "surface-container-low": "rgb(var(--c-surface-container-low) / <alpha-value>)",
        "state-warning-subtle": "rgb(var(--c-state-warning-subtle) / <alpha-value>)",
        "state-danger-subtle": "rgb(var(--c-state-danger-subtle) / <alpha-value>)",
        "state-warning": "rgb(var(--c-state-warning) / <alpha-value>)",
        "on-error-container": "rgb(var(--c-on-error-container) / <alpha-value>)",
        "border-soft": "rgb(var(--c-border-soft) / <alpha-value>)",
        "state-danger": "rgb(var(--c-state-danger) / <alpha-value>)",
        "error": "rgb(var(--c-error) / <alpha-value>)",
        "primary-fixed": "rgb(var(--c-primary-fixed) / <alpha-value>)",
        "surface-variant": "rgb(var(--c-surface-variant) / <alpha-value>)",
        "surface-container-high": "rgb(var(--c-surface-container-high) / <alpha-value>)",
        "surface-bright": "rgb(var(--c-surface-bright) / <alpha-value>)",
        "on-tertiary-container": "rgb(var(--c-on-tertiary-container) / <alpha-value>)",
        "on-surface-variant": "rgb(var(--c-on-surface-variant) / <alpha-value>)",
        "secondary": "rgb(var(--c-secondary) / <alpha-value>)",
        "inverse-on-surface": "rgb(var(--c-inverse-on-surface) / <alpha-value>)",
        "state-success": "rgb(var(--c-state-success) / <alpha-value>)",
        "surface-container": "rgb(var(--c-surface-container) / <alpha-value>)",
        "on-secondary-fixed": "rgb(var(--c-on-secondary-fixed) / <alpha-value>)",
        "on-secondary": "rgb(var(--c-on-secondary) / <alpha-value>)",
        "on-secondary-container": "rgb(var(--c-on-secondary-container) / <alpha-value>)",
        "background": "rgb(var(--c-background) / <alpha-value>)",
        "on-primary-fixed": "rgb(var(--c-on-primary-fixed) / <alpha-value>)",
        "on-secondary-fixed-variant": "rgb(var(--c-on-secondary-fixed-variant) / <alpha-value>)",
        "surface-tint": "rgb(var(--c-surface-tint) / <alpha-value>)",
        "primary-hover": "rgb(var(--c-primary-hover) / <alpha-value>)",
        "on-state": "rgb(var(--c-on-state) / <alpha-value>)"
      },
      "borderRadius": {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      "spacing": {
        "space-sm": "1rem",
        "margin-tablet": "2rem",
        "space-xl": "2.5rem",
        "container-max": "1280px",
        "space-3xl": "4rem",
        "space-2xs": "0.5rem",
        "space-lg": "2rem",
        "gutter-mobile": "1rem",
        "margin-desktop": "3rem",
        "space-md": "1.5rem",
        "space-3xs": "0.25rem",
        "space-2xl": "3rem",
        "gutter-desktop": "1.5rem",
        "space-xs": "0.75rem",
        "margin-mobile": "1rem"
      },
      "fontFamily": {
        "body-md": [
          "Cairo"
        ],
        "display-hero": [
          "Tajawal"
        ],
        "headline-xl": [
          "Tajawal"
        ],
        "headline-xl-mobile": [
          "Tajawal"
        ],
        "headline-lg": [
          "Tajawal"
        ],
        "label-lg": [
          "Cairo"
        ],
        "headline-sm": [
          "Tajawal"
        ],
        "display-hero-mobile": [
          "Tajawal"
        ],
        "headline-md": [
          "Tajawal"
        ],
        "body-lg": [
          "Cairo"
        ],
        "label-sm": [
          "Cairo"
        ],
        "body-sm": [
          "Cairo"
        ],
        "label-md": [
          "Cairo"
        ]
      },
      "fontSize": {
        "body-md": [
          "15px",
          {
            "lineHeight": "24px",
            "fontWeight": "400"
          }
        ],
        "display-hero": [
          "40px",
          {
            "lineHeight": "52px",
            "fontWeight": "700"
          }
        ],
        "headline-xl": [
          "32px",
          {
            "lineHeight": "42px",
            "fontWeight": "700"
          }
        ],
        "headline-xl-mobile": [
          "26px",
          {
            "lineHeight": "34px",
            "fontWeight": "700"
          }
        ],
        "headline-lg": [
          "24px",
          {
            "lineHeight": "34px",
            "fontWeight": "600"
          }
        ],
        "label-lg": [
          "15px",
          {
            "lineHeight": "22px",
            "fontWeight": "600"
          }
        ],
        "headline-sm": [
          "18px",
          {
            "lineHeight": "26px",
            "fontWeight": "600"
          }
        ],
        "display-hero-mobile": [
          "30px",
          {
            "lineHeight": "40px",
            "fontWeight": "700"
          }
        ],
        "headline-md": [
          "20px",
          {
            "lineHeight": "28px",
            "fontWeight": "600"
          }
        ],
        "body-lg": [
          "17px",
          {
            "lineHeight": "28px",
            "fontWeight": "400"
          }
        ],
        "label-sm": [
          "11px",
          {
            "lineHeight": "16px",
            "fontWeight": "600"
          }
        ],
        "body-sm": [
          "13px",
          {
            "lineHeight": "20px",
            "fontWeight": "400"
          }
        ],
        "label-md": [
          "13px",
          {
            "lineHeight": "18px",
            "fontWeight": "600"
          }
        ]
      }
    }
  },
  "corePlugins": {
    "preflight": false
  },
  "plugins": []
};
