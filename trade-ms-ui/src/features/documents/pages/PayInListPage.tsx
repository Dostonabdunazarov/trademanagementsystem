import { useTranslation } from 'react-i18next'
import { DocumentsListPage } from '../DocumentsListPage'

export function PayInListPage() {
  const { t } = useTranslation()
  return <DocumentsListPage type="PayIn" title={t('nav.payInList')} createPath="/pay-in" />
}
