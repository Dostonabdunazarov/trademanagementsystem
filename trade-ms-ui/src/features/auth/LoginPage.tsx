import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { AppLogoIcon } from '@/components/ui/AppLogo'
import { LanguageSelect } from '@/components/ui/LanguageSelect'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070d12]">
      {/* Soft gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, rgba(20,184,166,0.18) 0%, rgba(7,13,18,0) 60%), radial-gradient(90% 70% at 100% 100%, rgba(16,185,129,0.14) 0%, rgba(7,13,18,0) 65%), radial-gradient(80% 60% at 0% 90%, rgba(56,189,248,0.10) 0%, rgba(7,13,18,0) 60%), linear-gradient(160deg, #070d12 0%, #0a1419 55%, #071014 100%)',
        }}
      />

      {/* Ambient glow blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-teal-500/20 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-emerald-500/15 blur-[110px]"
      />

      {/* Language switcher top-right */}
      <LanguageSelect className="absolute top-4 right-4" />

      <div className="relative w-full max-w-md px-4">
        {/* Logo / brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 ring-1 ring-teal-500/30 shadow-lg shadow-teal-500/20">
            <AppLogoIcon size={40} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-[hsl(var(--text-primary))]">{t('auth.title')}</h1>
            <p className="mt-1 text-sm text-[hsl(var(--text-muted))]">{t('auth.subtitle')}</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
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
                  'w-full rounded-lg border bg-white/[0.04] px-4 py-2.5 text-sm text-[hsl(var(--text-primary))] placeholder-slate-600 outline-none transition-all duration-200',
                  'focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-500/50',
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
                    'w-full rounded-lg border bg-white/[0.04] py-2.5 pl-4 pr-11 text-sm text-[hsl(var(--text-primary))] placeholder-slate-600 outline-none transition-all duration-200',
                    'focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-500/50',
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
                'bg-teal-600 hover:bg-teal-500 active:scale-[0.98]',
                'shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070d12]',
                'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-teal-600',
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
