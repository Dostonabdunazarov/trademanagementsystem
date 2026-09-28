import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import i18n from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'

const t = i18n.getFixedT('ru')

function apiError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, {
    status, statusText: '', headers: {}, config, data,
  })
}

describe('getApiErrorMessage', () => {
  it('переводит код бизнес-правила с параметрами', () => {
    const err = apiError(409, {
      detail: 'Insufficient stock for product Кроссовки: available 2, needed 5',
      code: 'insufficientStock',
      args: { product: 'Кроссовки', unit: 'Pcs', available: 2, needed: 5 },
    })
    expect(getApiErrorMessage(err, t)).toBe(
      'Недостаточно товара «Кроссовки» на складе: доступно 2 шт, требуется 5 шт.',
    )
  })

  it('переводит статус документа', () => {
    const err = apiError(409, { code: 'documentNotDraft', args: { status: 'Confirmed' } })
    expect(getApiErrorMessage(err, t)).toContain('«Подтверждён»')
  })

  it('ошибки валидации — по коду и с номером строки', () => {
    const err = apiError(400, {
      code: 'validation',
      errors: [
        { field: 'Lines[1].Quantity', code: 'lineQuantityPositive', message: "'Quantity' must be greater than '0'." },
        { field: 'CurrencyId', code: 'currencyRequired', message: "'Currency Id' must not be empty." },
      ],
    })
    expect(getApiErrorMessage(err, t)).toBe(
      'Строка 2: Количество должно быть больше нуля.\nВыберите валюту.',
    )
  })

  it('валидация без перевода — запасной текст вместо английского', () => {
    const err = apiError(400, {
      code: 'validation',
      errors: [{ field: 'Name', code: 'NotEmptyValidator', message: "'Name' must not be empty." }],
    })
    expect(getApiErrorMessage(err, t, 'Ошибка создания')).toBe('Ошибка создания')
  })

  it('нет ответа сервера — сообщение о сети', () => {
    const err = new AxiosError('Network Error', 'ERR_NETWORK')
    expect(getApiErrorMessage(err, t)).toBe(t('errors.network'))
  })

  it('500 — общий текст, а не внутренности сервера', () => {
    const err = apiError(500, { detail: 'NullReferenceException at ...' })
    expect(getApiErrorMessage(err, t)).toBe(t('errors.server'))
  })

  it('409 без кода — detail сервера или запасной текст', () => {
    const err = apiError(409, { detail: 'Cannot delete a branch that has documents.' })
    expect(getApiErrorMessage(err, t)).toBe('Cannot delete a branch that has documents.')
    expect(getApiErrorMessage(err, t, 'Не удалось удалить')).toBe('Не удалось удалить')
  })
})
