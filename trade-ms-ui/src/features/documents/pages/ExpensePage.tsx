import { useTranslation } from 'react-i18next'
import { DocumentForm } from '../DocumentForm'

export function ExpensePage() {
  const { t } = useTranslation()
  return <DocumentForm type="Expense" title={t('nav.expense')} className="h-full" />
}
