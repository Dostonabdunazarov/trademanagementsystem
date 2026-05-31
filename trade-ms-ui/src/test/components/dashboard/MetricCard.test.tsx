import { describe, it, expect } from 'vitest'
import { screen, render } from '@testing-library/react'
import { TrendingUp } from 'lucide-react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import { MetricCard } from '@/components/dashboard/MetricCard'

function renderCard(props: Parameters<typeof MetricCard>[0]) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MetricCard {...props} />
    </I18nextProvider>
  )
}

describe('MetricCard', () => {
  it('отображает title и value', () => {
    renderCard({ title: 'Выручка', value: '5 000 000', icon: TrendingUp })
    expect(screen.getByText('Выручка')).toBeInTheDocument()
    expect(screen.getByText('5 000 000')).toBeInTheDocument()
  })

  it('отображает положительную дельту со стрелкой вверх', () => {
    renderCard({ title: 'Выручка', value: '5 000 000', icon: TrendingUp, delta: 12, deltaLabel: 'vs прошлый месяц' })
    expect(screen.getByText(/▲/)).toBeInTheDocument()
    expect(screen.getByText(/12%/)).toBeInTheDocument()
  })

  it('отображает отрицательную дельту со стрелкой вниз', () => {
    renderCard({ title: 'Выручка', value: '5 000 000', icon: TrendingUp, delta: -5 })
    expect(screen.getByText(/▼/)).toBeInTheDocument()
    expect(screen.getByText(/5%/)).toBeInTheDocument()
  })

  it('не показывает дельту когда не передана', () => {
    renderCard({ title: 'Продукты', value: '200', icon: TrendingUp })
    expect(screen.queryByText(/▲|▼/)).not.toBeInTheDocument()
  })

  it('показывает skeleton при loading=true', () => {
    const { container } = renderCard({ title: 'Выручка', value: '0', icon: TrendingUp, loading: true })
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByText('Выручка')).not.toBeInTheDocument()
  })

  it('применяет переданный className', () => {
    const { container } = renderCard({ title: 'Test', value: '1', icon: TrendingUp, className: 'custom-class' })
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
