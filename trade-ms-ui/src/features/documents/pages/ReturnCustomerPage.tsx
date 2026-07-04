import { useTranslation } from 'react-i18next'
import { DocumentForm } from '../DocumentForm'

export function ReturnCustomerPage() {
  const { t } = useTranslation()
  return <DocumentForm type="ReturnFromCustomer" title={t('nav.returnCustomer')} className="h-full" />
}
