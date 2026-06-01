---
name: ReNEW Farm Logic
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#825100'
  on-tertiary: '#ffffff'
  tertiary-container: '#a36700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  status-success: '#10b981'
  status-warning: '#f97316'
  status-error: '#ef4444'
  info-blue: '#3b82f6'
  map-zone: rgba(5, 150, 105, 0.2)
typography:
  hero-fruit:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-target: 48px
  gutter: 16px
  margin-mobile: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  safe-area-bottom: 32px
---

## Brand & Style
The brand personality is **Organic, Trustworthy, and High-Utility**. It is designed specifically for the Vietnamese agricultural sector, balancing the ruggedness of outdoor farm management with the precision of modern data tracking. The design system evokes a sense of reliability and growth, ensuring farmers feel empowered rather than overwhelmed by technology.

The aesthetic follows a **Corporate / Modern** movement with a heavy emphasis on **High-Contrast** and **Utility**. Because the application is a PWA used in direct sunlight, the style avoids subtle nuances in favor of clear boundaries, large touch targets, and a "Bottom-Heavy" layout philosophy that facilitates one-handed operation while walking through orchards. 

Key visual drivers include:
- **Outdoor Legibility:** Maximum contrast between surfaces and text.
- **Agricultural Resilience:** Functional elements that feel sturdy and responsive.
- **Vietnamese Localization:** Content hierarchy optimized for Vietnamese diacritics and sentence structures.

## Colors
The color palette is rooted in the "Emerald" primary green, symbolizing health and harvest. 
- **Primary (Emerald):** Used for critical actions, growth status, and active navigation.
- **Secondary (Slate):** Provides a grounded, neutral professional tone for secondary text and decorative elements.
- **Tertiary (Amber):** Dedicated to harvest-related highlights and "Fair" health status, offering high visibility against green backgrounds.
- **Status Colors:** A strict semantic mapping is used: Green for success/good health, Orange for warnings/fair health, and Red for urgent issues/poor health. 
- **Surface Strategy:** To combat screen glare, we use a pure white surface for cards and a very light Slate-50 (#f8fafc) for backgrounds to maintain a clean, high-contrast separation.

## Typography
The system uses **Inter** for its exceptional legibility and support for Vietnamese diacritics. The type scale is intentionally enlarged to accommodate older users and viewing in high-glare environments.

- **Hero / Display:** Used for numerical data like fruit counts, ensuring they are the most prominent element on the screen.
- **Headlines:** Use Bold weights to create clear section breaks.
- **Body Text:** A base of 16px is the absolute minimum for standard text to ensure accessibility.
- **Labels:** Used for metadata like GPS coordinates and timestamps, using medium/semibold weights to maintain readability at smaller scales.

## Layout & Spacing
The layout is **Mobile-First** and **Fluid**, utilizing a single-column structure for most views to maximize clarity.

- **One-Handed Operation:** All critical interactive elements (buttons, +/- counters) are clustered in the bottom 40% of the screen.
- **Touch Targets:** A strict 48px minimum height/width for all interactive areas ensures usability even with gloved or dirty hands.
- **Bottom Sheets:** Used extensively for data entry and tree details, sliding up to occupy 60-90% of the screen to keep controls within thumb-reach.
- **Safe Areas:** Generous bottom padding (32px) ensures content is never obscured by PWA navigation bars or OS indicators.

## Elevation & Depth
This design system uses **Tonal Layers** combined with **Ambient Shadows** to define hierarchy without cluttering the UI.

- **Surface Levels:** The background uses a flat neutral. Cards use a pure white fill with a soft, diffused shadow (Blur: 12px, Opacity: 0.08) to appear slightly lifted.
- **Active Modals:** Bottom sheets and modals use a higher elevation with a darker backdrop dim (40% black) to focus the user’s attention on the task at hand.
- **Backdrop Blur:** Navigation headers and fixed top bars use a 12px backdrop blur with a semi-transparent white tint to maintain context of the scrollable content beneath while keeping text legible.

## Shapes
The shape language is **Rounded**, leaning towards a friendly but professional feel.

- **2XL (16px):** The standard for cards, input fields, and standard buttons.
- **3XL (24px):** Used for primary containers, bottom sheets, and high-priority action cards to make them feel distinct and modern.
- **Full Circle:** Reserved for map markers, user location pips, and status indicators.
- **Inner Radii:** Nested elements should have a radius 4px smaller than their container to maintain visual harmony.

## Components

- **Buttons:** Primary buttons use the Emerald background with white text. They must span the full width of their container on mobile for easy tapping.
- **Stepper Controls (+/-):** Replaces standard text inputs for numerical data like fruit counts. Large, rounded buttons flank the central value.
- **Chips & Tags:** Used for "Phase" (e.g., Flowering, Harvest). These use low-saturation versions of the status colors with bold text.
- **Cards:** White containers with `rounded-2xl` corners. Information is stacked vertically with `stack-sm` (8px) spacing between related items.
- **Input Fields:** High-contrast borders (Slate-200) with a 16px base font size. Labels are always visible (not floating) to ensure the user never loses context.
- **Map Markers:** Distinctive circular markers with a "Yellow Pulse" animation for trees requiring immediate attention.
- **Bottom Sheets:** The primary container for detailed data entry. Includes a "grab handle" at the top for intuitive swiping.