import axios from 'axios'
import type { TFunction } from 'i18next'

/** Тело ошибки API — ProblemDetails с расширениями из GlobalExceptionHandler. */
interface ApiProblem {
  status?: number
  detail?: string
  code?: string
  args?: Record<string, unknown>
  errors?: { field: string; code: string; message: string }[]
}

/**
 * Понятный пользователю текст ошибки API на языке интерфейса.
 *
 * Порядок: код бизнес-правила или валидации → перевод; нет перевода → текст по
 * HTTP-статусу (сеть, права, 404, 5xx); иначе `fallback`, а без него — detail сервера.
 */
export function getApiErrorMessage(err: unknown, t: TFunction, fallback?: string): string {
  if (!axios.isAxiosError(err)) return fallback ?? t('errors.unknown')
  if (!err.response) return t('errors.network')

  const { status } = err.response
  const data = (err.response.data ?? {}) as ApiProblem

  if (data.code === 'validation' && data.errors?.length) {
    const messages = data.errors.map((e) => {
      // Без перевода — запасной текст экрана: английский текст валидатора пользователю не показываем.
      const text = translateCode(e.code, {}, t) ?? fallback ?? e.message
      // Lines[2].Quantity → «Строка 3: …», чтобы было ясно, какую позицию править.
      const line = /Lines\[(\d+)\]/.exec(e.field)
      return line ? t('errors.line', { n: Number(line[1]) + 1, message: text }) : text
    })
    return [...new Set(messages)].join('\n')
  }

  if (data.code) {
    const text = translateCode(data.code, data.args ?? {}, t)
    if (text) return text
  }

  if (status === 401) return t('errors.unauthorized')
  if (status === 403) return t('errors.forbidden')
  if (status === 404) return t('errors.notFound')
  if (status >= 500) return t('errors.server')

  return fallback ?? data.detail ?? t('errors.unknown')
}

function translateCode(code: string, args: Record<string, unknown>, t: TFunction): string | null {
  const text = t(`errors.codes.${code}`, { ...formatArgs(args, t), defaultValue: '' })
  return text || null
}

/** Статусы и единицы измерения приходят enum-именами — переводим их тем же словарём, что и UI. */
function formatArgs(args: Record<string, unknown>, t: TFunction): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(args)) {
    if (value == null) continue
    if (key === 'status') out[key] = t(`status.${value}`, { defaultValue: String(value) })
    else if (key === 'unit') out[key] = t(`products.units.${value}`, { defaultValue: String(value) })
    else if (typeof value === 'number') out[key] = value.toLocaleString('ru-RU')
    else out[key] = String(value)
  }
  return out
}
