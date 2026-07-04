import { useTranslation } from 'react-i18next'
import { DocumentsListPage } from '../DocumentsListPage'

export function PayOutListPage() {
  const { t } = useTranslation()
  return <DocumentsListPage type="PayOut" title={t('nav.payOutList')} createPath="/pay-out" />
}
