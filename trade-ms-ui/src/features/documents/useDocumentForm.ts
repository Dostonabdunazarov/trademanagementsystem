import { useState, useCallback, useMemo } from 'react'
import type { DocumentType, DocumentFormState, DocumentLine } from '@/types/document'
import { documentTotals, lineTotal, money } from '@/utils/money'
import { todayIso } from '@/utils/format'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function initialState(type: DocumentType): DocumentFormState {
  return {
    type,
    date: todayIso(),
    counterpartyId: '',
    counterpartyName: '',
    currencyId: '',
    currencyCode: '',
    exchangeRate: 1,
    note: '',
    lines: [],
    discountPercent: 0,
  }
}

export interface LoadedLine {
  productId: string
  productName: string
  unit: string
  quantity: number
  price: number
  discountPercent: number
}

export interface UseDocumentFormReturn {
  state: DocumentFormState
  setDate: (date: string) => void
  setCounterparty: (id: string, name: string) => void
  setCurrency: (id: string, code: string, rate: number) => void
  setExchangeRate: (rate: number) => void
  setNote: (note: string) => void
  setDiscount: (percent: number) => void
  addLine: (product: { id: string; name: string; unit: string }, qty: number, price: number, discount?: number) => void
  updateLine: (id: string, field: 'quantity' | 'price' | 'discountPercent', value: number) => void
  removeLine: (id: string) => void
  /** Заполняет форму документом целиком (строки не склеиваются по товару). */
  load: (data: Omit<DocumentFormState, 'type' | 'lines'> & { lines: LoadedLine[] }) => void
  clearForm: () => void
  subtotal: number
  discountAmount: number
  totalWithDiscount: number
  totalInBase: number
}

export function useDocumentForm(type: DocumentType): UseDocumentFormReturn {
  const [state, setState] = useState<DocumentFormState>(() => initialState(type))

  const setDate = useCallback((date: string) => {
    setState((s) => ({ ...s, date }))
  }, [])

  const setCounterparty = useCallback((id: string, name: string) => {
    setState((s) => ({ ...s, counterpartyId: id, counterpartyName: name }))
  }, [])

  const setCurrency = useCallback((id: string, code: string, rate: number) => {
    setState((s) => ({ ...s, currencyId: id, currencyCode: code, exchangeRate: rate }))
  }, [])

  const setExchangeRate = useCallback((rate: number) => {
    setState((s) => ({ ...s, exchangeRate: rate }))
  }, [])

  const setNote = useCallback((note: string) => {
    setState((s) => ({ ...s, note }))
  }, [])

  const setDiscount = useCallback((percent: number) => {
    setState((s) => ({ ...s, discountPercent: Math.max(0, Math.min(100, percent)) }))
  }, [])

  const addLine = useCallback(
    (
      product: { id: string; name: string; unit: string },
      qty: number,
      price: number,
      discount = 0,
    ) => {
      setState((s) => {
        const existing = s.lines.find((l) => l.productId === product.id)
        if (existing) {
          return {
            ...s,
            lines: s.lines.map((l) => {
              if (l.productId !== product.id) return l
              const newQty = l.quantity + qty
              return { ...l, quantity: newQty, total: lineTotal(newQty, l.price, l.discountPercent) }
            }),
          }
        }
        const newLine: DocumentLine = {
          id: generateId(),
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          quantity: qty,
          price,
          discountPercent: discount,
          total: lineTotal(qty, price, discount),
        }
        return { ...s, lines: [...s.lines, newLine] }
      })
    },
    [],
  )

  const updateLine = useCallback(
    (id: string, field: 'quantity' | 'price' | 'discountPercent', value: number) => {
      setState((s) => ({
        ...s,
        lines: s.lines.map((l) => {
          if (l.id !== id) return l
          const updated = { ...l, [field]: value }
          return { ...updated, total: lineTotal(updated.quantity, updated.price, updated.discountPercent) }
        }),
      }))
    },
    [],
  )

  const removeLine = useCallback((id: string) => {
    setState((s) => ({ ...s, lines: s.lines.filter((l) => l.id !== id) }))
  }, [])

  const load = useCallback<UseDocumentFormReturn['load']>((data) => {
    setState({
      ...data,
      type,
      lines: data.lines.map((l) => ({
        ...l,
        id: generateId(),
        total: lineTotal(l.quantity, l.price, l.discountPercent),
      })),
    })
  }, [type])

  const clearForm = useCallback(() => {
    setState(initialState(type))
  }, [type])

  const totals = useMemo(
    () => documentTotals(state.lines.map((l) => l.total), state.discountPercent),
    [state.lines, state.discountPercent],
  )

  const totalInBase = useMemo(
    () => money(totals.total * state.exchangeRate),
    [totals.total, state.exchangeRate],
  )

  return {
    state,
    setDate,
    setCounterparty,
    setCurrency,
    setExchangeRate,
    setNote,
    setDiscount,
    addLine,
    updateLine,
    removeLine,
    load,
    clearForm,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    totalWithDiscount: totals.total,
    totalInBase,
  }
}
