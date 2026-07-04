import { useTranslation } from 'react-i18next'
import { DocumentsListPage } from '../DocumentsListPage'

export function IncomeListPage() {
  const { t } = useTranslation()
  return <DocumentsListPage type="Income" title={t('nav.incomeList')} createPath="/income" />
}
