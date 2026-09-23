/** Design tokens carried over verbatim from the Tailwind CDN config that
 *  every legacy app page inlined. Preflight stays off: the landing and auth
 *  pages were designed against legacy.css alone, so app/globals.css applies
 *  an equivalent reset scoped to .shifa-app-shell instead. */
/** @type {import('tailwindcss').Config} */
module.exports = {
  "content": [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}"
  ],
  "theme": {
    "extend": {
      "colors": {
        "text-body": "#1e293b",
        "canvas-bg": "#f0f7ff",
        "tertiary-fixed": "#6ffbbe",
        "text-muted": "#64748b",
        "surface-container-lowest": "#ffffff",
        "on-tertiary": "#ffffff",
        "error-container": "#ffdad6",
        "state-success-subtle": "#ecfdf5",
        "border-focus": "#0f766e",
        "surface-subtle": "#f8fafc",
        "surface-container-highest": "#d3e4fe",
        "outline-variant": "#bdc9c6",
        "surface-card": "#ffffff",
        "surface": "#f8f9ff",
        "inverse-primary": "#80d5cb",
        "inverse-surface": "#213145",
        "text-heading": "#115e59",
        "on-tertiary-fixed-variant": "#005236",
        "state-info": "#0284c7",
        "surface-dim": "#cbdbf5",
        "on-primary-container": "#a3faef",
        "secondary-container": "#5bb8fe",
        "primary-container": "#0f766e",
        "on-error": "#ffffff",
        "outline": "#6e7977",
        "on-primary-fixed-variant": "#00504a",
        "secondary-fixed-dim": "#93ccff",
        "on-background": "#0b1c30",
        "on-surface": "#0b1c30",
        "on-primary": "#ffffff",
        "secondary-fixed": "#cce5ff",
        "tertiary-fixed-dim": "#4edea3",
        "tertiary-container": "#007952",
        "primary": "#005c55",
        "tertiary": "#005e3f",
        "text-primary": "#0f766e",
        "state-info-subtle": "#f0f9ff",
        "primary-fixed-dim": "#80d5cb",
        "on-tertiary-fixed": "#002113",
        "surface-container-low": "#eff4ff",
        "state-warning-subtle": "#fffbeb",
        "state-danger-subtle": "#fef2f2",
        "state-warning": "#d97706",
        "on-error-container": "#93000a",
        "border-soft": "#e2e8f0",
        "state-danger": "#dc2626",
        "error": "#ba1a1a",
        "primary-fixed": "#9cf2e8",
        "surface-variant": "#d3e4fe",
        "surface-container-high": "#dce9ff",
        "surface-bright": "#f8f9ff",
        "on-tertiary-container": "#99ffcd",
        "on-surface-variant": "#3e4947",
        "secondary": "#006398",
        "inverse-on-surface": "#eaf1ff",
        "state-success": "#16a34a",
        "surface-container": "#e5eeff",
        "on-secondary-fixed": "#001d31",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#00476e",
        "background": "#f8f9ff",
        "on-primary-fixed": "#00201d",
        "on-secondary-fixed-variant": "#004b73",
        "surface-tint": "#006a63"
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
