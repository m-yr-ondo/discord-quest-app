# Discord Quest App Design System

## Atmosphere

Discord Quest App has one visual mode: OLED-black dark neumorphism with a single orange accent. The page is true black (`#000000`); every raised, inset, or interactive surface is `#0f1013`. Structure comes from paired top-left light and bottom-right black shadows, never borders.

## Tokens

| Role | Token | Value |
|---|---|---|
| Page | `--app-bg` | `#000000` |
| Surface | `--app-panel` | `#0f1013` |
| Surface hover | `--app-panel-hover` | `#15171b` |
| Primary text | `--app-text` | `#e6e8ee` |
| Muted text | `--app-text-muted` | `#9aa3b2` |
| Accent | `--app-accent` | `#ff8a3d` |
| Accent hover | `--app-accent-hover` | `#ffa05f` |
| Running | `--app-success` | `#4ade80` |
| Danger | `--app-danger` | `#fb7185` |
| Idle / off LEDs | `--app-dot-idle` / `--app-dot-off` | `#6b7384` / `#3b4150` |
| Countdown track / done fill | `--app-ring-track` / `--app-fill-done` | `#050506` / `#4b5263` |

Typography uses Inter with `system-ui` fallback and JetBrains Mono with `ui-monospace` fallback. Page titles are 30px/700, panel headings are 20–22px/700, card titles are 15px/600, body text is 14px, and metadata is 12px muted. Spacing uses a 4px base; panels use 24px padding, cards use 14px, and page sections use 24px gaps.

## Depth model

Every element with a shadow has its own surface fill.

| Depth | Use | Shadow |
|---|---|---|
| Raised | Panels, cards, header | `8px 8px 16px #000, -6px -6px 14px #24272d` |
| Raised small | Buttons, rows, inactive navigation | `4px 4px 9px #000, -3px -3px 8px #24272d` |
| Inset | Search, wells, selected/current controls | `inset 5px 5px 10px #000, inset -4px -4px 9px #1f2227` |
| Convex | Primary actions only | `linear-gradient(145deg, #17191d, #0b0c0e)` plus raised small |

Panels use 28px radii; cards, headers and lanes use 22px; wells use 18px; buttons use 14px; search uses 24px; large primary actions use 26px; icon buttons are round.

## Component recipes

- Header and panels: raised surface.
- Search, executable lists, activity log and progress tracks: inset surfaces.
- Primary actions: convex raised-small surfaces with orange text.
- Secondary actions: raised-small muted text surfaces.
- Selected navigation and game cards: inset surface plus orange text and a visible non-shadow cue.
- Status LEDs: green with glow for running, idle blue-grey for ready, dark blue-grey for unavailable or queued, and danger pink with a label for errors.
- Progress fills: orange while running; blue-grey when complete.

Home remains a responsive two-column screen. Game Chain keeps its lane and add panel. Settings contains only application-data actions. Dialogs use an opaque black backdrop and raised panels. Toasts are raised pills.

## States and accessibility

Raised controls brighten and gain raised depth on hover, use inset depth when pressed, and show a 2px orange focus ring with 3px offset. Selected/current controls use inset depth, orange text, and a label, check, or LED. Disabled controls have 45% opacity and do not respond to pointer input.

All controls use semantic elements and keep keyboard focus visible. Icon-only controls have accessible names. Motion transitions only box-shadow, color, and background color over 180ms; reduced-motion preferences disable transitions and animation.
