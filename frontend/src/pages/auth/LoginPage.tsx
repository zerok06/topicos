import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { Mail, Lock, Shield, Users, User, LogIn } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { DEMO_CREDENTIALS } from '../../utils/constants'
import { keycloakConfig, buildAuthorizationUrl } from '../../services/keycloak.service'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type LoginForm = z.infer<typeof loginSchema>

export const LoginPage: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data)
      navigate({ to: '/dashboard' })
    } catch {
      // Error handled in store
    }
  }

  const fillDemoCredentials = (email: string, password: string) => {
    setValue('email', email)
    setValue('password', password)
    clearError()
  }

  return (
    <div className="min-h-screen bg-command-center flex relative overflow-hidden">
      {/* Background command center tactical canvas */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 dot-matrix" />
        <div className="absolute inset-0 tech-grid" />
        {/* Spotlights: Stark White top-right, Metallic Silver bottom-left */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-white/4 rounded-full blur-[150px]" />
        <div className="absolute -bottom-40 -left-40 w-[750px] h-[750px] bg-slate-500/4 rounded-full blur-[180px]" />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-nikeOrange/10 via-transparent to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <svg className="w-20 h-8 text-white fill-current filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" viewBox="0 0 24 24">
              <path d="M21 6.5c-2.4 1.6-6.1 3.8-9 5.2-2.3 1.1-4.7 2.1-7.1 2.9-.6.2-1.2.4-1.9.4-.3 0-.6 0-.8-.2-.3-.2-.4-.5-.4-.9 0-1.1.7-2.7 1.8-4.4.9-1.4 2.1-2.9 3.5-4.2.3-.3.8-.4 1.1-.2.3.2.4.6.2 1-.7 1.4-1.4 3.1-1.7 4.5.7-.2 1.5-.6 2.4-1.1 3.2-1.8 7-4.1 10.4-5.6.8-.4 1.7-.8 2.5-.9.4 0 .7.1.8.4.1.3 0 .7-.5 1.1z" />
            </svg>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-bold tracking-tight text-white/95 leading-tight"
          >
            Plataforma de
            <br />
            Inteligencia Logística
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-white/40 mt-4 max-w-md"
          >
            Sistema integrado de gestión de inventario, tracking y auditoría
            con IA conversacional.
          </motion.p>
        </div>

        <div className="relative z-10 space-y-4">
          {DEMO_CREDENTIALS.map((cred) => (
            <button
              key={cred.email}
              onClick={() => fillDemoCredentials(cred.email, cred.password)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl glass-panel hover:border-white/30 transition-all text-left group"
            >
              {cred.label === 'Administrador' && (
                <Shield className="w-5 h-5 text-red-500" />
              )}
              {cred.label === 'Supervisor' && (
                <Users className="w-5 h-5 text-blue-400" />
              )}
              {cred.label === 'Operador' && (
                <User className="w-5 h-5 text-green-400" />
              )}
              <div>
                <div className="text-sm font-semibold text-white/90">
                  {cred.label}
                </div>
                <div className="text-xs text-white/40">{cred.email}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <svg className="w-16 h-6 text-white fill-current filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" viewBox="0 0 24 24">
              <path d="M21 6.5c-2.4 1.6-6.1 3.8-9 5.2-2.3 1.1-4.7 2.1-7.1 2.9-.6.2-1.2.4-1.9.4-.3 0-.6 0-.8-.2-.3-.2-.4-.5-.4-.9 0-1.1.7-2.7 1.8-4.4.9-1.4 2.1-2.9 3.5-4.2.3-.3.8-.4 1.1-.2.3.2.4.6.2 1-.7 1.4-1.4 3.1-1.7 4.5.7-.2 1.5-.6 2.4-1.1 3.2-1.8 7-4.1 10.4-5.6.8-.4 1.7-.8 2.5-.9.4 0 .7.1.8.4.1.3 0 .7-.5 1.1z" />
            </svg>
            <span className="text-xl font-bold tracking-wider uppercase text-white/95">
              Nike Logística
            </span>
          </div>

          <h2 className="text-2xl font-bold text-white/95 mb-2">Iniciar Sesión</h2>
          <p className="text-sm text-white/40 mb-8">
            Ingresa tus credenciales para acceder al sistema
          </p>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="admin@nike.com"
              icon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" loading={isLoading} className="w-full" size="lg">
              Iniciar Sesión
            </Button>
          </form>

          {keycloakConfig.enabled && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#050507] px-3 text-white/30">O continúa con</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.location.href = buildAuthorizationUrl()}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-sm transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Iniciar sesión con Keycloak
              </button>
            </>
          )}

          <div className="mt-6 lg:hidden space-y-2">
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3">
              Credenciales Demo
            </p>
            {DEMO_CREDENTIALS.map((cred) => (
              <button
                key={cred.email}
                onClick={() => fillDemoCredentials(cred.email, cred.password)}
                className="w-full text-xs text-white/60 hover:text-nikeOrange transition-colors text-left p-2 rounded-lg hover:bg-white/5"
              >
                <strong className="text-white/80">{cred.label}:</strong>{' '}
                {cred.email} / {cred.password}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
