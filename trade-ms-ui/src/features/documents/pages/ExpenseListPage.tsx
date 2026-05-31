import { DocumentsListPage } from '../DocumentsListPage'

export function ExpenseListPage() {
  return <DocumentsListPage type="Expense" title="Список расходов" createPath="/expense" />
}
