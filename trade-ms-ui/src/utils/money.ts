/**
 * Денежное округление как на бэкенде: `Math.Round(x, 2, MidpointRounding.AwayFromZero)`.
 * `toPrecision(15)` убирает хвосты двоичной арифметики (1.005 * 100 = 100.49999…).
 */
export function money(value: number): number {
  if (!Number.isFinite(value)) return 0
  const sign = value < 0 ? -1 : 1
  const scaled = Number((Math.abs(value) * 100).toPrecision(15))
  return (sign * Math.round(scaled)) / 100
}

/** Сумма строки: `Money(qty * price * (1 - discount / 100))`, как при сохранении документа. */
export function lineTotal(quantity: number, price: number, discountPercent: number): number {
  return money(quantity * price * (1 - discountPercent / 100))
}

export interface DocumentTotals {
  subtotal: number
  discountAmount: number
  total: number
}

/**
 * Итоги документа по формуле сервера: сумма строк, скидка документа
 * `Money(subtotal * d / 100)`, итог = subtotal − скидка.
 */
export function documentTotals(lineTotals: number[], discountPercent: number): DocumentTotals {
  const subtotal = money(lineTotals.reduce((acc, v) => acc + v, 0))
  const discountAmount = money(subtotal * (discountPercent / 100))
  return { subtotal, discountAmount, total: money(subtotal - discountAmount) }
}
