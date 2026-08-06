# Discord Quest Completer Design System

## 1. Atmosphere & Identity

The app is a compact desktop command surface for managing Discord games. The
Original theme preserves the current utility-first light/dark appearance. The
Neon theme translates the supplied reference into a quiet dark control room:
near-black navy surfaces, restrained violet light, thin cool borders, and one
clear accent for active actions and selection.

## 2. Color

### Palette

| Role | Token | Original light | Original dark | Neon | Ember | Usage |
|------|-------|----------------|---------------|------|-------|-------|
| Page background | `--app-bg` | `#f3f4f6` | `#111827` | `#060618` | `#0b0a09` | App shell and page canvas |
| Panel | `--app-panel` | `#ffffff` | `#1f2937` | `#0d0d2b` | `#171514` | Header, cards, controls |
| Panel hover | `--app-panel-hover` | `#f3f4f6` | `#374151` | `#1a1a3e` | `#24201e` | Hovered rows and controls |
| Primary text | `--app-text` | `#111827` | `#ffffff` | `#e8e8ff` | `#f5ede4` | Headings and readable content |
| Muted text | `--app-text-muted` | `#6b7280` | `#9ca3af` | `#9898b8` | `#a89a8c` | Supporting copy and metadata |
| Accent | `--app-accent` | `#4f46e5` | `#818cf8` | `#a855f7` | `#d97745` | Active navigation and primary actions |
| Accent hover | `--app-accent-hover` | `#4338ca` | `#a5b4fc` | `#c084fc` | `#eb8b55` | Hover and focus emphasis |
| Border | `--app-border` | `#e5e7eb` | `#374151` | `#242452` | `#342c28` | Standard separators |
| Strong border | `--app-border-strong` | `#d1d5db` | `#4b5563` | `#37376b` | `#4a3b33` | Inputs and selected surfaces |
| Success | `--app-success` | `#16a34a` | `#22c55e` | `#4ade80` | `#4ade80` | Running and ready state |
| Danger | `--app-danger` | `#dc2626` | `#ef4444` | `#fb7185` | `#f87171` | Remove and stop actions |

Functional status colors remain distinct from structural theme colors. The
existing Vue logo green and selected-game glow remain brand/state details.

### Rules

- Structural colors use the semantic tokens above.
- Neon is always dark and does not depend on the operating-system color mode.
- Ember is always dark, uses flat surfaces, and adds no glow, gradient, or new shadow treatment.
- Accent is reserved for navigation, focus, selection, and primary actions.
- Text and focus states must maintain WCAG AA contrast.

## 3. Typography

### Scale

The existing Tailwind scale remains: page titles use `text-3xl`, section titles
use `text-xl`, body copy uses `text-sm` or `text-base`, and metadata uses
`text-xs`.

### Font Stack

- Primary: existing system sans stack from Tailwind.
- Mono: existing `font-mono` utility only for executable/path metadata.

## 4. Spacing & Layout

- Base unit: 4px through the existing Tailwind spacing scale.
- Preserve the current desktop two-column Home layout and single-column mobile
  collapse.
- Settings uses the same centered container and panel rhythm as existing pages.
- Theme switching changes color and surface treatment, not page geometry.

## 5. Components

### App Shell

- **Structure**: header navigation, scrollable main slot, footer.
- **Variants**: Original, Neon, Ember.
- **States**: active navigation, hover, keyboard focus.
- **Accessibility**: semantic header/nav/main/footer; keyboard-reachable links.

### Theme Option

- **Structure**: labeled radio option with name and short description.
- **Variants**: Original selected, Neon selected, Ember selected, unfocused, keyboard focus.
- **States**: default, hover, checked, focus-visible.
- **Accessibility**: native radio input remains in the DOM; labels are clickable.

### Surface Panel

- **Structure**: one bounded panel containing related content.
- **Variants**: page panel, list row, elevated control.
- **States**: default, hover where interactive, selected where applicable.
- **Depth**: tonal shift plus restrained borders; Neon may use a single accent rim
  for selected content.

## 6. Motion & Interaction

- Theme changes apply immediately without page navigation or reload.
- Use the existing short color transitions for hover states.
- Do not add decorative animation to the Settings page.
- Respect `prefers-reduced-motion` for any existing transitions.

## 7. Depth & Surface

Strategy: mixed tonal shift and restrained borders.

- Original uses the current flat light/dark panels and borders.
- Neon uses near-black layered panels, cool purple borders, and a restrained
  accent glow only for active/selected controls.
- Avoid stacking nested glowing containers.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- WCAG 2.2 AA target for text and focus states.
- Theme selection must be keyboard reachable and announced as a radio group.
- The selected theme must remain legible on both light and dark system settings.
- No horizontal overflow at 375px, 768px, or 1280px widths.

### Accepted Debt

| Item | Location | Why accepted | Exit |
|------|----------|--------------|------|
| Existing utility classes are being migrated incrementally | Existing pages | Theme work is limited to the two requested palettes | Consolidate in a later visual cleanup |
| Some functional colors (green/red/blue/yellow) remain hardcoded | GameExecutables, status indicators | These are status colors, not structural theme colors | Migrate to semantic status tokens if expanded |

## 9. Implementation Notes

Theme tokens are defined in `src/theme/style.css` using Tailwind v4 CSS-first variables. The theme is applied via `document.documentElement.dataset.theme` and persisted in `localStorage` through `src/services/settings.ts`. The `useGlobalState` composable exposes `theme` and `setTheme()` for reactive access.

Tailwind utilities are generated via `@theme inline` and can be used as `bg-app-bg`, `text-app-text`, `border-app-border`, etc.

The Settings page (`src/pages/SettingsView.vue`) provides an accessible radio group for theme selection and is wired into the navigation via `Pages.SETTINGS`.
