/** Флаги стран как SVG — полноцветные на всех ОС (эмодзи-флаги на Windows не рендерятся). */

const base = "shrink-0 rounded-[2px] ring-1 ring-black/20";

/** Флаг России: бело-сине-красный триколор. */
export function FlagRU({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 9 6" className={`${base} ${className ?? ""}`} aria-hidden role="img">
      <rect width="9" height="6" fill="#fff" />
      <rect y="2" width="9" height="4" fill="#0039a6" />
      <rect y="4" width="9" height="2" fill="#d52b1e" />
    </svg>
  );
}

/** Флаг Узбекистана: голубой-белый-зелёный с красными кантами, полумесяц и 12 звёзд. */
export function FlagUZ({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" className={`${base} ${className ?? ""}`} aria-hidden role="img">
      <rect width="18" height="4" y="0" fill="#1eb53a" />
      <rect width="18" height="4" y="4" fill="#fff" />
      <rect width="18" height="4" y="8" fill="#0099b5" />
      {/* красные канты */}
      <rect width="18" height="0.35" y="3.85" fill="#ce1126" />
      <rect width="18" height="0.35" y="7.8" fill="#ce1126" />
      {/* полумесяц */}
      <g fill="#fff">
        <circle cx="3.4" cy="2" r="1.2" />
        <circle cx="3.9" cy="2" r="1.05" fill="#0099b5" />
        {/* звёзды (упрощённо — точки) */}
        <circle cx="5.2" cy="1" r="0.18" />
        <circle cx="6.1" cy="1" r="0.18" />
        <circle cx="7" cy="1" r="0.18" />
        <circle cx="6.1" cy="2" r="0.18" />
        <circle cx="7" cy="2" r="0.18" />
        <circle cx="7.9" cy="2" r="0.18" />
      </g>
    </svg>
  );
}
