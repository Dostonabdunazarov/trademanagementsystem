import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  /** Красная кнопка подтверждения — для удаления и отмены документа. */
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Подтверждение опасного действия (удаление, отмена проведённого документа). */
export function ConfirmDialog({
  open, title, description, confirmLabel, destructive = true, busy = false, onConfirm, onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="bg-card border-border text-[hsl(var(--text-primary))] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-[hsl(var(--text-muted))]">{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={destructive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-brand-600 hover:bg-brand-500'}
          >
            {busy ? t('common.loading') : confirmLabel ?? t('common.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
