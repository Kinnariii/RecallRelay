---
name: RecallRelay Design System
colors:
  surface: '#fcf8fe'
  surface-dim: '#dcd9df'
  surface-bright: '#fcf8fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f2f8'
  surface-container: '#f0edf3'
  surface-container-high: '#eae7ed'
  surface-container-highest: '#e4e1e7'
  on-surface: '#1b1b1f'
  on-surface-variant: '#444652'
  inverse-surface: '#303034'
  inverse-on-surface: '#f3eff6'
  outline: '#747683'
  outline-variant: '#c4c6d4'
  surface-tint: '#3959b0'
  primary: '#001d59'
  on-primary: '#ffffff'
  primary-container: '#003087'
  on-primary-container: '#7f9df8'
  inverse-primary: '#b4c5ff'
  secondary: '#005ab6'
  on-secondary: '#ffffff'
  secondary-container: '#0872e2'
  on-secondary-container: '#fefcff'
  tertiary: '#002533'
  on-tertiary: '#ffffff'
  tertiary-container: '#003c50'
  on-tertiary-container: '#35acda'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#1c4197'
  secondary-fixed: '#d7e3ff'
  secondary-fixed-dim: '#abc7ff'
  on-secondary-fixed: '#001b3f'
  on-secondary-fixed-variant: '#00458f'
  tertiary-fixed: '#c0e8ff'
  tertiary-fixed-dim: '#70d2ff'
  on-tertiary-fixed: '#001e2b'
  on-tertiary-fixed-variant: '#004d66'
  background: '#fcf8fe'
  on-background: '#1b1b1f'
  surface-variant: '#e4e1e7'
typography:
  display-hero:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  tabular-data:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an enterprise-grade fintech environment balancing institutional security with rapid AI audit ergonomics. Grounded in a modern corporate identity, the visual language merges the unshakeable reliability of tier-one financial infrastructure with forward-leaning audit transparency. 

The aesthetic is characterized by high clarity, structured information hierarchy, and crisp pill-shaped affordances. It avoids decorative clutter in favor of tabular precision, intentional evidence tracing, and calm contrast ratios. Interfaces should evoke decisive confidence, mathematical accuracy, and friction-free verification during mission-critical AI decision audits.

## Colors

The palette is anchored by Brand Navy (`#003087`), delivering institutional authority, paired with Accent Blue (`#0070E0`) and Sky Blue (`#62CFFF`) for interactive focus, verification paths, and active highlights. 

### Neutral Palette & Canvases
- **Ink Black (`#0B0B0F`)**: Core typography, high-contrast actions, and foundational structural boundaries.
- **Canvas Base (`#F2F5FA`)**: Low-strain workbench background for dense audit workflows.
- **Surface Pure (`#FFFFFF`)**: Card surfaces, raised navigation, and active input backgrounds.
- **Border Stroke (`#E3E8F0`)**: Hairline boundaries framing structural containers.

### Audit & Status Tokens
Status indicators operate on high-visibility two-tone pairings (saturated foreground text on soft tinted containers):
- **Confirmed**: Foreground `#12805C` on container `#E3F6EE`.
- **Unaffected**: Foreground `#5B6475` on container `#EEF0F4`.
- **Uncertain / Needs Review**: Foreground `#B25E00` on container `#FFF1DB`.
- **Failed**: Foreground `#C5221F` on container `#FDEBEA`.
- **Pending**: Foreground `#0070E0` on container `#E6F0FD`.

### Evidence Highlighting
- **Evidence Marker (`#FFE98A`)**: Applied as an inline text highlight wash with a 2px vertical bleed.
- **Evidence Badge (`#0B0B0F` on `#FFE98A`)**: Small circular numbered markers indexing highlighted artifacts back to audit drawers.

## Typography

The type scale combines authoritative geometric display headlines in Outfit with utilitarian body copy in Inter.

- **Headlines (Outfit)**: Set at heavy weights (700 and 800) with tightened tracking to anchor primary dashboard cards, metrics, and workflow phases.
- **Body & Controls (Inter)**: Prioritizes legible structural forms at 14px and 16px.
- **Tabular Figures**: Every numeric display, transaction record, token cost, and confidence score strictly enforces OpenType tabular figures (`font-feature-settings: "tnum" 1, "cv05" 1`) to ensure perfect vertical alignment across ledger tables and split views.
- **Labels**: Capitalized micro-labels utilize positive letter-spacing (`0.04em` to `0.06em`) to ensure legibility when contextualizing complex financial states.

## Layout & Spacing

Layouts follow a structured 12-column fluid grid system pinned inside a max-width container of 1440px.

- **Desktop (≥ 1024px)**: 12 columns, 24px gutters (`gutter`), 32px canvas margins (`margin`). Audit drawers snap to a 440px fixed right rail with the main inspection ledger flexing across the remaining columns.
- **Tablet (768px - 1023px)**: 8 columns, 16px gutters, 24px margins. Drawers transition to bottom sheets or slide-over overlays.
- **Mobile (< 768px)**: 4 columns, 16px gutters, 16px margins. Multi-column metric groups collapse into stacked vertical cards.

Component internal padding relies strictly on the `space-*` tokens:
- Micro-elements (badges, counters): `space-xs` and `space-sm`.
- Standard interactive elements (buttons, inputs): `space-sm` vertical, `space-md` horizontal.
- Containers and cards: `space-lg` to `space-xl` internally.

## Elevation & Depth

Visual hierarchy uses clean atmospheric depth rather than dense drop shadows, keeping data readable:

- **Flat Foundation**: Background `#F2F5FA` establishes zero elevation.
- **Card Surface**: Pure `#FFFFFF` surfaces rely on a 1px solid stroke in `#E3E8F0` coupled with a soft, diffused ambient shadow: `0px 2px 8px rgba(11, 11, 15, 0.04), 0px 1px 2px rgba(11, 11, 15, 0.02)`.
- **Raised Interactive Surfaces (Hovered Cards, Dropdowns)**: Elevated to `0px 12px 24px -4px rgba(0, 48, 135, 0.06), 0px 4px 8px -2px rgba(11, 11, 15, 0.04)`. Tinting shadows with subtle Brand Navy preserves enterprise tone while signaling interactivity.
- **Modals & Flyouts (Evidence Drawer, Sandbox Inspector)**: `0px 24px 48px -12px rgba(11, 11, 15, 0.14)`, separated by a 1px left-border `#E3E8F0`.

## Shapes

The design system employs a geometric shape language pairing pill-shaped actions with structured, rounded cards:

- **Pill Geometry (9999px / Level 3)**: Used across primary, secondary, and tertiary action buttons, filter tags, progress capsules, and status chips.
- **Card Enclosures (24px)**: Outer boundary of dashboard cards, audit containers, and data panels.
- **Field & Surface Inputs (12px)**: Form inputs, date pickers, dropdown selects, and code audit cells.
- **Brand Geometry**: The core application mark is an extruded rounded square (20% curvature ratio) in `#003087` containing a circular relay cycle arrow.

## Components

### Buttons
- **Primary Action**: Pill-shaped button (`rounded-full`), solid Ink Black (`#0B0B0F`) background, `#FFFFFF` text, 44px height, horizontal padding `space-lg`. Hover shifts to `#003087` with smooth transition.
- **Secondary Action**: Pill-shaped button, soft grey-blue container (`#EEF0F4`), `#0B0B0F` text. Hover shifts to `#E2E7F0`.
- **Brand Emphasis Action**: Solid Brand Navy (`#003087`) pill with `#FFFFFF` text, active ring in Accent Blue (`#0070E0`).

### Cards & Panels
- Constructed with a 24px corner radius, `#FFFFFF` fill, 1px `#E3E8F0` border, and default ambient elevation.
- Padding is fixed at 24px (`1.5rem`). Metric cards feature a distinct header region dividing metadata labels from large Outfit numerical totals.

### Form Inputs & Selectors
- Constructed with a 12px corner radius, 44px height, `#FFFFFF` background, and 1px border in `#E3E8F0`.
- Active focus state removes default browser outlines and applies a 2px outer ring in Accent Blue (`#0070E0`) with 0px offset.

### 4-Step Progress Tracker
- Positioned directly below the primary application navigation bar.
- Horizontal layout consisting of 4 connected capsule segments representing audit states: *Ingest*, *Verify*, *Arbitrate*, *Disburse*.
- Completed steps display solid Brand Navy with white numeric checkmarks; the active step displays Accent Blue with an animated outer pulse ring; future steps display a 1px border in `#E3E8F0` on `#F2F5FA`.

### Status Badges & Chips
- Fully rounded pills (`height: 24px`, padding `0 10px`) utilizing the exact status text and background pairings defined in the palette.
- Text rendered in `label-sm` with tabular figure counters embedded when displaying batch totals.

### Evidence Highlighting & Audit Drawer
- Text references within transactions or AI explanation feeds contain a `#FFE98A` background wash.
- Each highlight is prefixed by an 18px numbered circular badge (`#0B0B0F` background, white text) that activates the sliding Evidence Drawer on click.
- The Evidence Drawer slides out from the right viewport boundary (440px wide, 24px inner padding, `#FFFFFF` base) containing raw prompt data, verification cryptographic proofs, and replay timestamps.

### Sandbox Indicators
- Sandbox, replay, and staging environments are marked with an omnipresent top status indicator: 28px height, pill form factor, striped Accent Blue boundary with subtle `#E6F0FD` background fill and text reading `SANDBOX REPLAY MODE · BLOCK #194821`.