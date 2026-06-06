import { useTranslation } from 'react-i18next'
import { PaymentForm } from '../PaymentForm'

export function PayOutPage() {
  const { t } = useTranslation()
  return <PaymentForm type="PayOut" title={t('nav.payOut')} className="h-full" />
}
