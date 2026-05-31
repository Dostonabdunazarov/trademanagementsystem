import { DocumentsListPage } from '../DocumentsListPage'

export function ReturnSupplierListPage() {
  return (
    <DocumentsListPage
      type="ReturnToSupplier"
      title="Возврат поставщику — список"
      createPath="/return-supplier"
    />
  )
}
