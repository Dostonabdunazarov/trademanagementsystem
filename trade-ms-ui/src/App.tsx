import { Toaster } from 'sonner'
import { AppRouter } from '@/router'

export default function App() {
  return (
    <>
      <AppRouter />
      <Toaster richColors position="top-right" />
    </>
  )
}
