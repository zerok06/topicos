import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { Mail, Lock, User } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import type { UserRole } from '../../types/auth'

const registerSchema = z
  .object({
    email: z.string().email('Email inválido'),
    username: z.string().min(3, 'Mínimo 3 caracteres').max(100),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string(),
    role: z.enum(['admin', 'supervisor', 'operador']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export const RegisterPage: React.FC = () => {
  const { register: registerUser, isLoading, error } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'operador' },
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser({
        email: data.email,
        username: data.username,
        password: data.password,
        role: data.role as UserRole,
      })
      navigate({ to: '/dashboard' })
    } catch {
      // Error handled in store
    }
  }

  return (
    <div className="min-h-screen bg-command-center flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background command center tactical canvas */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 dot-matrix" />
        <div className="absolute inset-0 tech-grid" />
        {/* Spotlights: Stark White top-right, Metallic Silver bottom-left */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-white/4 rounded-full blur-[150px]" />
        <div className="absolute -bottom-40 -left-40 w-[750px] h-[750px] bg-slate-500/4 rounded-full blur-[180px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex items-center gap-3 mb-8">
          <svg className="w-16 h-6 text-white fill-current filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" viewBox="0 0 24 24">
            <path d="M21 6.5c-2.4 1.6-6.1 3.8-9 5.2-2.3 1.1-4.7 2.1-7.1 2.9-.6.2-1.2.4-1.9.4-.3 0-.6 0-.8-.2-.3-.2-.4-.5-.4-.9 0-1.1.7-2.7 1.8-4.4.9-1.4 2.1-2.9 3.5-4.2.3-.3.8-.4 1.1-.2.3.2.4.6.2 1-.7 1.4-1.4 3.1-1.7 4.5.7-.2 1.5-.6 2.4-1.1 3.2-1.8 7-4.1 10.4-5.6.8-.4 1.7-.8 2.5-.9.4 0 .7.1.8.4.1.3 0 .7-.5 1.1z" />
          </svg>
          <span className="text-xl font-bold tracking-wider uppercase text-white/95">
            Nike Logística
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white/95 mb-2">Crear Usuario</h2>
        <p className="text-sm text-white/40 mb-8">
          Registra un nuevo usuario en el sistema
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
            placeholder="usuario@nike.com"
            icon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Username"
            type="text"
            placeholder="usuario"
            icon={<User className="w-4 h-4" />}
            error={errors.username?.message}
            {...register('username')}
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirmar Contraseña"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Rol</Label>
            <Select defaultValue="operador" onValueChange={(val) => setValue('role', val as any)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" loading={isLoading} className="w-full" size="lg">
            Registrar Usuario
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
