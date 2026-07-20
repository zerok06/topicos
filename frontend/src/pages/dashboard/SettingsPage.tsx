import React, { useState } from 'react'
import { User, Lock, Bell, Palette, Loader2 } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { useAuthStore } from '../../store/useAuthStore'
import { authService } from '../../services/auth.service'
import { toast } from 'sonner'

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)
  const [notifications, setNotifications] = useState({
    stockCritical: true,
    transfers: true,
    audit: false,
    chatbot: true,
  })

  const roleLabel =
    user?.role === 'admin'
      ? 'Administrador'
      : user?.role === 'supervisor'
        ? 'Supervisor'
        : 'Operador'

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Completa todos los campos')
      return
    }
    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setChangingPw(true)
    try {
      await authService.changeMyPassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast.success('Contraseña actualizada correctamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al cambiar contraseña')
    } finally {
      setChangingPw(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card
        title="Perfil de Usuario"
        icon={<User className="w-5 h-5 text-nikeOrange" />}
      >
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-nikeOrange/20 border border-nikeOrange/30 flex items-center justify-center text-nikeOrange font-bold text-2xl">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white/90">{user?.username}</h3>
            <p className="text-sm text-white/50">{user?.email}</p>
            <div className="mt-2">
              <Badge variant="info">{roleLabel}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Username</Label>
            <Input
              type="text"
              value={user?.username || ''}
              disabled
              className="text-white/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={user?.email || ''}
              disabled
              className="text-white/50"
            />
          </div>
        </div>
      </Card>

      {/* Change password */}
      <Card
        title="Cambiar Contraseña"
        icon={<Lock className="w-5 h-5 text-nikeOrange" />}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label>Contraseña Actual</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nueva Contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Confirmar Contraseña</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleChangePassword} loading={changingPw}>
            {changingPw ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
            Actualizar Contraseña
          </Button>
        </div>
      </Card>

      {/* Notifications */}
      <Card
        title="Preferencias de Notificaciones"
        icon={<Bell className="w-5 h-5 text-nikeOrange" />}
      >
        <div className="space-y-4">
          {[
            { key: 'stockCritical', label: 'Alertas de Stock Crítico', desc: 'Notificar cuando el stock baja del mínimo' },
            { key: 'transfers', label: 'Traslados de Stock', desc: 'Notificar traslados confirmados' },
            { key: 'audit', label: 'Registros de Auditoría', desc: 'Notificar nuevos registros de auditoría' },
            { key: 'chatbot', label: 'Respuestas del Chatbot', desc: 'Notificar respuestas del asistente IA' },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5"
            >
              <div>
                <p className="text-sm font-semibold text-white/90">{item.label}</p>
                <p className="text-xs text-white/40">{item.desc}</p>
              </div>
              <Switch
                checked={notifications[item.key as keyof typeof notifications]}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({
                    ...prev,
                    [item.key]: checked,
                  }))
                }
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Theme */}
      <Card
        title="Apariencia"
        icon={<Palette className="w-5 h-5 text-nikeOrange" />}
      >
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
          <div>
            <p className="text-sm font-semibold text-white/90">Tema Oscuro</p>
            <p className="text-xs text-white/40">Tema Nike Premium activo</p>
          </div>
          <Badge variant="success">Activo</Badge>
        </div>
      </Card>
    </div>
  )
}
