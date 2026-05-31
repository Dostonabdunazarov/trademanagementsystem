import { DocumentsListPage } from '../DocumentsListPage'

export function ReturnCustomerListPage() {
  return (
    <DocumentsListPage
      type="ReturnFromCustomer"
      title="Возврат от клиента — список"
      createPath="/return-customer"
    />
  )
}
