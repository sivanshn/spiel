# Tailwind Integration

Use CSS variables inside Tailwind config:

```js
export default {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        surface: 'var(--surface-card)',
        muted: 'var(--text-muted)'
      },
      borderRadius: {
        xl: 'var(--radius-xl)'
      }
    }
  }
}
```

Avoid too many arbitrary values like `bg-[#123456]` unless prototyping.
