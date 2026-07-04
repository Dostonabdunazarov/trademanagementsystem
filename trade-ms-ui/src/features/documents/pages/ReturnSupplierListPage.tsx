import { useTranslation } from 'react-i18next'
import { DocumentsListPage } from '../DocumentsListPage'

export function ReturnSupplierListPage() {
  const { t } = useTranslation()
  return (
    <DocumentsListPage
      type="ReturnToSupplier"
      title={t('nav.returnSupplierList')}
      createPath="/return-supplier"
    />
  )
}
