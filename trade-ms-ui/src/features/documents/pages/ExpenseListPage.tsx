import { useTranslation } from 'react-i18next'
import { DocumentsListPage } from '../DocumentsListPage'

export function ExpenseListPage() {
  const { t } = useTranslation()
  return <DocumentsListPage type="Expense" title={t('nav.expenseList')} createPath="/expense" />
}
