import { useTranslation } from 'react-i18next'
import { DocumentForm } from '../DocumentForm'

export function ReturnSupplierPage() {
  const { t } = useTranslation()
  return <DocumentForm type="ReturnToSupplier" title={t('nav.returnSupplier')} className="h-full" />
}
