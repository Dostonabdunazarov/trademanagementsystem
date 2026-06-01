# Shadow Variants для Sidebar и Header

Все 4 варианта готовы к применению в `MainLayout.tsx` и `index.css`.

---

## Вариант 1 — Soft Glow (рекомендуется)

Мягкое indigo-свечение по краям. Соответствует accent-цвету проекта.

### index.css — dark theme (`:root`)
```css
/* Sidebar */
aside {
  box-shadow: 4px 0 24px rgba(99, 102, 241, 0.12);
}

/* Header */
header {
  box-shadow: 0 4px 24px rgba(99, 102, 241, 0.10);
}
```

### index.css — light theme (`html.light`)
```css
html.light aside {
  box-shadow: 4px 0 24px rgba(99, 102, 241, 0.14) !important;
}

html.light header {
  box-shadow: 0 4px 24px rgba(99, 102, 241, 0.12) !important;
}
```

---

## Вариант 2 — Layered Depth

Двухслойная тень: ближняя чёткая + дальняя рассеянная. Более "материальный" вид.

### index.css — dark theme
```css
aside {
  box-shadow:
    2px 0 8px rgba(0, 0, 0, 0.25),
    4px 0 32px rgba(99, 102, 241, 0.10);
}

header {
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.20),
    0 4px 28px rgba(99, 102, 241, 0.08);
}
```

### index.css — light theme
```css
html.light aside {
  box-shadow:
    2px 0 8px rgba(0, 0, 0, 0.08),
    4px 0 32px rgba(99, 102, 241, 0.10) !important;
}

html.light header {
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 4px 28px rgba(99, 102, 241, 0.09) !important;
}
```

---

## Вариант 3 — Glassmorphism

Полупрозрачный фон + backdrop-blur + тень. Современный "стеклянный" эффект.

### MainLayout.tsx — aside className (заменить `bg-[hsl(var(--background))]`)
```tsx
// Dark: было
'bg-[hsl(var(--background))]'

// Dark: стало
'bg-[rgba(15,14,23,0.85)] backdrop-blur-xl'
```

### MainLayout.tsx — header className
```tsx
// Dark: было
'bg-[hsl(var(--background))]'

// Dark: стало
'bg-[rgba(15,14,23,0.75)] backdrop-blur-2xl'
```

### index.css — dark theme
```css
aside {
  background: rgba(15, 14, 23, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.35);
}

header {
  background: rgba(15, 14, 23, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
}
```

### index.css — light theme
```css
html.light aside {
  background: rgba(255, 255, 255, 0.80) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  box-shadow: 4px 0 24px rgba(99, 102, 241, 0.10) !important;
}

html.light header {
  background: rgba(255, 255, 255, 0.75) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  box-shadow: 0 4px 24px rgba(99, 102, 241, 0.08) !important;
}
```

---

## Вариант 4 — Accent Border Glow

Тонкая светящаяся indigo-линия по краю sidebar + header. Очень изящно.

### index.css — dark theme
```css
/* Sidebar: заменяет стандартный border-r */
aside {
  border-right: 1px solid rgba(99, 102, 241, 0.30);
  box-shadow: 4px 0 20px rgba(99, 102, 241, 0.18);
}

/* Header: заменяет стандартный border-b */
header {
  border-bottom: 1px solid rgba(99, 102, 241, 0.25);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.14);
}
```

### index.css — light theme
```css
html.light aside {
  border-right-color: rgba(99, 102, 241, 0.35) !important;
  box-shadow: 4px 0 20px rgba(99, 102, 241, 0.18) !important;
}

html.light header {
  border-bottom-color: rgba(99, 102, 241, 0.30) !important;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.14) !important;
}
```

---

## Комбо: Вариант 1 + Вариант 4

Самая красивая комбинация — accent border + soft glow одновременно.

### index.css — dark theme
```css
aside {
  border-right: 1px solid rgba(99, 102, 241, 0.30);
  box-shadow:
    4px 0 24px rgba(99, 102, 241, 0.14),
    2px 0 8px rgba(0, 0, 0, 0.20);
}

header {
  border-bottom: 1px solid rgba(99, 102, 241, 0.25);
  box-shadow:
    0 4px 24px rgba(99, 102, 241, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.18);
}
```

### index.css — light theme
```css
html.light aside {
  border-right-color: rgba(99, 102, 241, 0.35) !important;
  box-shadow:
    4px 0 24px rgba(99, 102, 241, 0.16),
    2px 0 8px rgba(0, 0, 0, 0.06) !important;
}

html.light header {
  border-bottom-color: rgba(99, 102, 241, 0.30) !important;
  box-shadow:
    0 4px 24px rgba(99, 102, 241, 0.14),
    0 2px 8px rgba(0, 0, 0, 0.05) !important;
}
```
