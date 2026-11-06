import type { Config } from "tailwindcss"

export default {
  "darkMode": "class",
  "theme": {
    "extend": {
      "colors": {
        "on-secondary-container": "#fefcff",
        "on-secondary": "#ffffff",
        "outline": "#747683",
        "surface": "#fcf8fe",
        "tertiary-fixed": "#c0e8ff",
        "primary-fixed": "#dbe1ff",
        "primary-container": "#003087",
        "inverse-primary": "#b4c5ff",
        "on-error-container": "#93000a",
        "surface-container": "#f0edf3",
        "on-tertiary-fixed": "#001e2b",
        "tertiary-fixed-dim": "#70d2ff",
        "on-error": "#ffffff",
        "on-secondary-fixed": "#001b3f",
        "inverse-on-surface": "#f3eff6",
        "on-primary": "#ffffff",
        "secondary-fixed": "#d7e3ff",
        "on-primary-container": "#7f9df8",
        "on-tertiary-fixed-variant": "#004d66",
        "surface-container-low": "#f6f2f8",
        "on-surface": "#1b1b1f",
        "on-background": "#1b1b1f",
        "surface-container-highest": "#e4e1e7",
        "primary": "#001d59",
        "background": "#fcf8fe",
        "secondary-fixed-dim": "#abc7ff",
        "surface-tint": "#3959b0",
        "tertiary-container": "#003c50",
        "outline-variant": "#c4c6d4",
        "secondary": "#005ab6",
        "error-container": "#ffdad6",
        "error": "#ba1a1a",
        "on-tertiary-container": "#35acda",
        "surface-dim": "#dcd9df",
        "inverse-surface": "#303034",
        "surface-container-lowest": "#ffffff",
        "on-secondary-fixed-variant": "#00458f",
        "surface-variant": "#e4e1e7",
        "primary-fixed-dim": "#b4c5ff",
        "on-primary-fixed": "#00174b",
        "surface-bright": "#fcf8fe",
        "surface-container-high": "#eae7ed",
        "on-primary-fixed-variant": "#1c4197",
        "on-tertiary": "#ffffff",
        "on-surface-variant": "#444652",
        "tertiary": "#002533",
        "secondary-container": "#0872e2"
      },
      "borderRadius": {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px"
      },
      "spacing": {
        "space-xl": "2rem",
        "margin": "2rem",
        "space-sm": "0.5rem",
        "space-lg": "1.5rem",
        "space-md": "1rem",
        "space-xs": "0.25rem",
        "gutter": "1.5rem"
      },
      "fontFamily": {
        "headline-md": [
          "Outfit"
        ],
        "label-md": [
          "Inter"
        ],
        "display-hero": [
          "Outfit"
        ],
        "body-sm": [
          "Inter"
        ],
        "body-lg": [
          "Inter"
        ],
        "label-sm": [
          "Inter"
        ],
        "headline-lg": [
          "Outfit"
        ],
        "headline-lg-mobile": [
          "Outfit"
        ],
        "body-md": [
          "Inter"
        ],
        "headline-sm": [
          "Outfit"
        ],
        "display-hero-mobile": [
          "Outfit"
        ],
        "tabular-data": [
          "Inter"
        ]
      },
      "fontSize": {
        "headline-md": [
          "24px",
          {
            "lineHeight": "32px",
            "letterSpacing": "-0.015em",
            "fontWeight": "700"
          }
        ],
        "label-md": [
          "12px",
          {
            "lineHeight": "16px",
            "letterSpacing": "0.04em",
            "fontWeight": "600"
          }
        ],
        "display-hero": [
          "48px",
          {
            "lineHeight": "56px",
            "letterSpacing": "-0.03em",
            "fontWeight": "800"
          }
        ],
        "body-sm": [
          "14px",
          {
            "lineHeight": "20px",
            "fontWeight": "400"
          }
        ],
        "body-lg": [
          "18px",
          {
            "lineHeight": "28px",
            "fontWeight": "400"
          }
        ],
        "label-sm": [
          "11px",
          {
            "lineHeight": "14px",
            "letterSpacing": "0.06em",
            "fontWeight": "700"
          }
        ],
        "headline-lg": [
          "32px",
          {
            "lineHeight": "40px",
            "letterSpacing": "-0.02em",
            "fontWeight": "700"
          }
        ],
        "headline-lg-mobile": [
          "24px",
          {
            "lineHeight": "32px",
            "letterSpacing": "-0.01em",
            "fontWeight": "700"
          }
        ],
        "body-md": [
          "16px",
          {
            "lineHeight": "24px",
            "fontWeight": "400"
          }
        ],
        "headline-sm": [
          "18px",
          {
            "lineHeight": "26px",
            "letterSpacing": "-0.01em",
            "fontWeight": "700"
          }
        ],
        "display-hero-mobile": [
          "32px",
          {
            "lineHeight": "40px",
            "letterSpacing": "-0.02em",
            "fontWeight": "800"
          }
        ],
        "tabular-data": [
          "15px",
          {
            "lineHeight": "22px",
            "letterSpacing": "-0.005em",
            "fontWeight": "600"
          }
        ]
      }
    }
  },
  "content": [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ]
} satisfies Config
