import { useState, useCallback, useMemo } from 'react'
import type { DocumentType, DocumentFormState, DocumentLine } from '@/types/document'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function initialState(type: DocumentType): DocumentFormState {
  return {
    type,
    date: today(),
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

export interface UseDocumentFormReturn {
  state: DocumentFormState
  setDate: (date: string) => void
  setCounterparty: (id: string, name: string) => void
  setCurrency: (id: string, code: string, rate: number) => void
  setNote: (note: string) => void
  setDiscount: (percent: number) => void
  addLine: (product: { id: string; name: string; unit: string }, qty: number, price: number, discount?: number) => void
  updateLine: (id: string, field: 'quantity' | 'price' | 'discountPercent', value: number) => void
  removeLine: (id: string) => void
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
              const discFactor = 1 - l.discountPercent / 100
              return { ...l, quantity: newQty, total: newQty * l.price * discFactor }
            }),
          }
        }
        const discFactor = 1 - discount / 100
        const newLine: DocumentLine = {
          id: generateId(),
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          quantity: qty,
          price,
          discountPercent: discount,
          total: qty * price * discFactor,
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
          const discFactor = 1 - updated.discountPercent / 100
          return { ...updated, total: updated.quantity * updated.price * discFactor }
        }),
      }))
    },
    [],
  )

  const removeLine = useCallback((id: string) => {
    setState((s) => ({ ...s, lines: s.lines.filter((l) => l.id !== id) }))
  }, [])

  const clearForm = useCallback(() => {
    setState(initialState(type))
  }, [type])

  const subtotal = useMemo(
    () => state.lines.reduce((acc, l) => acc + l.total, 0),
    [state.lines],
  )

  const discountAmount = useMemo(
    () => subtotal * (state.discountPercent / 100),
    [subtotal, state.discountPercent],
  )

  const totalWithDiscount = useMemo(
    () => subtotal - discountAmount,
    [subtotal, discountAmount],
  )

  const totalInBase = useMemo(
    () => totalWithDiscount * state.exchangeRate,
    [totalWithDiscount, state.exchangeRate],
  )

  return {
    state,
    setDate,
    setCounterparty,
    setCurrency,
    setNote,
    setDiscount,
    addLine,
    updateLine,
    removeLine,
    clearForm,
    subtotal,
    discountAmount,
    totalWithDiscount,
    totalInBase,
  }
}
