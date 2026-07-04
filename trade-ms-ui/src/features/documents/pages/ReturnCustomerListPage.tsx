import { useTranslation } from 'react-i18next'
import { DocumentsListPage } from '../DocumentsListPage'

export function ReturnCustomerListPage() {
  const { t } = useTranslation()
  return (
    <DocumentsListPage
      type="ReturnFromCustomer"
      title={t('nav.returnCustomerList')}
      createPath="/return-customer"
    />
  )
}
