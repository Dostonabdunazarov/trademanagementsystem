import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Languages } from 'lucide-react'
import { AppLogoIcon } from '@/components/ui/AppLogo'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth.store'
import { useUiStore } from '@/store/ui.store'
import { cn } from '@/lib/utils'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const { language, setLanguage } = useUiStore()
  const [showPassword, setShowPassword] = useState(false)

  const schema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(1, t('auth.enterPassword')),
  })
  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: ({ email, password }: FormValues) => authApi.login(email, password),
    onSuccess: (data) => {
      login(data)
      navigate('/', { replace: true })
    },
    onError: () => {
      setError('password', { message: t('auth.invalidCredentials') })
    },
  })

  const onSubmit = (values: FormValues) => mutation.mutate(values)

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      {/* Background video */}
      <video
        aria-hidden
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/login-bg-poster.jpg"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: '70% center' }}
      >
        <source src="/login-bg.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay for readability */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80"
      />

      {/* Language switcher top-right */}
      <div className="absolute top-4 right-4 flex items-center gap-1 rounded-lg border border-border bg-white/[0.03] p-1">
        <Languages className="h-3.5 w-3.5 text-[hsl(var(--text-muted))] mx-1" />
        <button
          onClick={() => setLanguage('ru')}
          className={cn(
            'rounded px-2 py-0.5 text-xs font-medium transition-colors',
            language === 'ru' ? 'bg-indigo-500/20 text-indigo-400' : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]',
          )}
        >
          RU
        </button>
        <button
          onClick={() => setLanguage('uz')}
          className={cn(
            'rounded px-2 py-0.5 text-xs font-medium transition-colors',
            language === 'uz' ? 'bg-indigo-500/20 text-indigo-400' : 'text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]',
          )}
        >
          UZ
        </button>
      </div>

      <div className="relative w-full max-w-md px-4">
        {/* Logo / brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-500/20">
            <AppLogoIcon size={40} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-[hsl(var(--text-primary))]">{t('auth.title')}</h1>
            <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">{t('auth.subtitle')}</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-[hsl(var(--surface-2))] p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[hsl(var(--text-primary))]">{t('auth.welcome')}</h2>
            <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">{t('auth.loginPrompt')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-[hsl(var(--text-primary))]">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@company.com"
                {...register('email')}
                className={cn(
                  'w-full rounded-lg border bg-[hsl(var(--surface-2))] px-4 py-2.5 text-sm text-[hsl(var(--text-primary))] placeholder-slate-600 outline-none transition-all duration-200',
                  'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500/50',
                  errors.email
                    ? 'border-red-500/60 focus-visible:ring-red-500'
                    : 'border-border hover:border-white/[0.15]',
                )}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-[hsl(var(--text-primary))]">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={cn(
                    'w-full rounded-lg border bg-[hsl(var(--surface-2))] py-2.5 pl-4 pr-11 text-sm text-[hsl(var(--text-primary))] placeholder-slate-600 outline-none transition-all duration-200',
                    'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500/50',
                    errors.password
                      ? 'border-red-500/60 focus-visible:ring-red-500'
                      : 'border-border hover:border-white/[0.15]',
                  )}
                />
                <button
                  type="button"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] transition-colors duration-150"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={mutation.isPending}
              className={cn(
                'relative w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200',
                'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]',
                'shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-indigo-600',
              )}
            >
              {mutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('auth.loggingIn')}
                </span>
              ) : (
                t('auth.login')
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[hsl(var(--text-muted))]">
          Торговля © {new Date().getFullYear()} — {t('auth.rights')}
        </p>
      </div>
    </div>
  )
}
