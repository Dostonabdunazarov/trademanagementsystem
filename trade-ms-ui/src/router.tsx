import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { setupCrossTabAuthSync } from '@/lib/session'
import { useAuthStore } from '@/store/auth.store'
import { LoginPage } from '@/features/auth/LoginPage'
import { MainLayout } from '@/layouts/MainLayout'
import { AuditLogsPage } from '@/features/audit/AuditLogsPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ExpensePage } from '@/features/documents/pages/ExpensePage'
import { IncomePage } from '@/features/documents/pages/IncomePage'
import { ReturnCustomerPage } from '@/features/documents/pages/ReturnCustomerPage'
import { ReturnSupplierPage } from '@/features/documents/pages/ReturnSupplierPage'
import { PayOutPage } from '@/features/documents/pages/PayOutPage'
import { PayInPage } from '@/features/documents/pages/PayInPage'
import { ExpenseListPage } from '@/features/documents/pages/ExpenseListPage'
import { IncomeListPage } from '@/features/documents/pages/IncomeListPage'
import { ReturnCustomerListPage } from '@/features/documents/pages/ReturnCustomerListPage'
import { ReturnSupplierListPage } from '@/features/documents/pages/ReturnSupplierListPage'
import { PayOutListPage } from '@/features/documents/pages/PayOutListPage'
import { PayInListPage } from '@/features/documents/pages/PayInListPage'
import { ProductsPage } from '@/features/products/ProductsPage'
import { CounterpartiesPage } from '@/features/counterparties/CounterpartiesPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { HelpPage } from '@/features/help/HelpPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'Admin') return <Navigate to="/" replace />
  return <>{children}</>
}

export function AppRouter() {
  // Logout/login и ротация токенов в другой вкладке сразу применяются здесь.
  useEffect(() => setupCrossTabAuthSync(), [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        {/* Формы создания / редактирования */}
        <Route path="/expense" element={<ExpensePage />} />
        <Route path="/income" element={<IncomePage />} />
        <Route path="/return-customer" element={<ReturnCustomerPage />} />
        <Route path="/return-supplier" element={<ReturnSupplierPage />} />
        <Route path="/pay-out" element={<PayOutPage />} />
        <Route path="/pay-in" element={<PayInPage />} />

        {/* Списки документов */}
        <Route path="/expenses" element={<ExpenseListPage />} />
        <Route path="/incomes" element={<IncomeListPage />} />
        <Route path="/return-customers" element={<ReturnCustomerListPage />} />
        <Route path="/return-suppliers" element={<ReturnSupplierListPage />} />
        <Route path="/pay-outs" element={<PayOutListPage />} />
        <Route path="/pay-ins" element={<PayInListPage />} />

        {/* Справочники и прочее */}
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/counterparties" element={<CounterpartiesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route
          path="/audit-logs"
          element={
            <AdminRoute>
              <AuditLogsPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
