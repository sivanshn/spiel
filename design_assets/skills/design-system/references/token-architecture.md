# Token Architecture

Use three layers:

1. Primitive tokens: raw values like `--color-blue-600`, `--spacing-4`, `--radius-lg`.
2. Semantic tokens: purpose-based aliases like `--color-primary`, `--surface-card`, `--text-muted`.
3. Component tokens: component-specific aliases like `--button-bg`, `--card-border`, `--modal-backdrop`.

Never let components depend directly on too many raw values. Semantic tokens allow theme switching and consistent redesign.
