import { useTranslation } from 'react-i18next'
import { DocumentForm } from '../DocumentForm'

export function IncomePage() {
  const { t } = useTranslation()
  return <DocumentForm type="Income" title={t('nav.income')} className="h-full" />
}
