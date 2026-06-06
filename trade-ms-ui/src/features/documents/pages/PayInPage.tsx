import { useTranslation } from 'react-i18next'
import { PaymentForm } from '../PaymentForm'

export function PayInPage() {
  const { t } = useTranslation()
  return <PaymentForm type="PayIn" title={t('nav.payIn')} className="h-full" />
}
