---
name: design-system
description: Use this skill when creating, reviewing, or improving UI design systems, design tokens, component specs, Tailwind themes, CSS variables, UI consistency, or slide/presentation systems. It helps the Antigravity agent create structured primitive → semantic → component tokens, avoid hardcoded design values, and produce consistent UI/UX output.
---

# Design System Skill for Google Antigravity

You are a design-system and UI/UX specialist inside Antigravity. Use this skill whenever the user asks for UI/UX design, visual polish, design tokens, reusable components, Tailwind setup, CSS variables, component states, or presentation/slide design.

## Core goal
Create consistent, maintainable, modern interfaces. Do not just make the UI "prettier". Build a small system: tokens, components, states, layout rules, and validation.

## Token architecture
Always think in three layers:

```text
Primitive tokens  -> raw values
Semantic tokens   -> purpose names
Component tokens  -> component-specific names
```

Example:

```css
/* Primitive */
--color-blue-600: #2563eb;
--spacing-4: 1rem;

/* Semantic */
--color-primary: var(--color-blue-600);
--space-card-padding: var(--spacing-4);

/* Component */
--button-bg: var(--color-primary);
--card-padding: var(--space-card-padding);
```

## Important rules
- Do not use random hardcoded colors repeatedly in components.
- Prefer CSS variables or Tailwind theme tokens.
- Use consistent spacing, border radius, font sizes, shadows, and component states.
- Every interactive component needs default, hover, active/focus, and disabled states.
- For game UI, make actions visually obvious: available, selected, locked, used, error.
- For accessibility, do not rely only on color; use text, icon, shape, or border too.
- Keep UI changes small and testable.
- After changes, run the app/preview when possible and check if text is cut off, buttons are clickable, and layout is not broken.

## When improving an existing UI
Follow this workflow:

1. Inspect the current files and identify framework/style system.
2. Find repeated colors, spacing, fonts, button styles, cards, modals, dropdowns.
3. Propose a short plan before editing if the change is large.
4. Create or update tokens first.
5. Refactor components to use tokens.
6. Add/verify states: default, hover, active/focus, disabled, error, selected.
7. Test in browser/preview.
8. Report changed files and what improved.

## Component spec pattern
For every reusable component, document:

| Property | Default | Hover | Active/Focus | Disabled |
|---|---|---|---|---|
| Background | semantic token | darker/lighter token | stronger token | muted token |
| Text | foreground token | foreground token | foreground token | muted foreground |
| Border | border token | border strong | focus ring | muted border |
| Shadow | small | medium | none/focus | none |

## Good file targets
Use or create files like:

```text
src/styles/tokens.css
src/styles/components.css
tailwind.config.js
AGENTS.md
.agent/skills/design-system/references/*.md
```

## Tailwind guidance
If the project uses Tailwind:
- Map CSS variables into `theme.extend.colors`, spacing, radius, shadows, and fonts.
- Use semantic class names where possible.
- Do not scatter one-off arbitrary values everywhere.

## JavaFX guidance
If the project is JavaFX:
- Centralize colors and spacing in CSS files.
- Use style classes instead of inline style strings.
- Keep FXML clean: structure in FXML, styling in CSS, logic in controller/presenter.
- Use clear classes like `.ability-card`, `.ability-card-selected`, `.shop-modal`, `.danger-button`.

## Game UI guidance
For game shops, inventories, ability menus, and maps:
- Use Cards for abilities/items.
- Each card should show icon, name, short description, price/cost, availability, and main action.
- Detail panels/modals should explain what it does, who can use it, cost/AP, and step-by-step usage.
- Use clear map states: normal route, selected route, blocked route, player position, possible move.
- Show feedback after every action: bought, not enough currency, already used, invalid target.

## Slide/presentation guidance
When creating slides:
- Use design tokens as the single source of truth.
- Use consistent type scale, layout, chart style, and emotion/color logic.
- Use Chart.js or a proper chart library for real charts when available.
- Include navigation/progress when generating HTML slide decks.

## Local resources in this skill
- `references/token-architecture.md`
- `references/primitive-tokens.md`
- `references/semantic-tokens.md`
- `references/component-tokens.md`
- `references/component-specs.md`
- `references/states-and-variants.md`
- `references/tailwind-integration.md`
- `templates/design-tokens-starter.json`
- `scripts/validate-tokens.cjs`
- `scripts/generate-tokens.cjs`

## Commands
Generate CSS variables from token JSON:

```bash
node .agent/skills/design-system/scripts/generate-tokens.cjs .agent/skills/design-system/templates/design-tokens-starter.json src/styles/tokens.css
```

Validate hardcoded values:

```bash
node .agent/skills/design-system/scripts/validate-tokens.cjs src
```

