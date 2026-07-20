import React, { useEffect, useState, useMemo } from 'react'
import {
  Users as UsersIcon,
  Shield,
  User as UserIcon,
  RefreshCw,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Key,
  Trash2,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Save,
  Activity,
  Clock,
  CheckSquare,
  Square,
  Settings,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '../../components/ui/card'
import { Loader } from '../../components/ui/Loader'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { MetricCard } from '../../components/metrics/MetricCard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs'
import { useAuthStore } from '../../store/useAuthStore'
import { authService } from '../../services/auth.service'
import { Can } from '../../components/auth/Can'
import { toast } from 'sonner'
import type { User, UserRole, UserUpdateData, Permission, SetUserPermissionRequest } from '../../types/auth'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] },
  },
}

const roleConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin: { label: 'Administrador', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <Shield className="w-3 h-3" /> },
  supervisor: { label: 'Supervisor', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <UsersIcon className="w-3 h-3" /> },
  operador: { label: 'Operador', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: <UserIcon className="w-3 h-3" /> },
}

export const UsersPage: React.FC = () => {
  const { user: currentUser, hasRole } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<UserUpdateData>({})
  const [saving, setSaving] = useState(false)

  const [showCreate, setShowCreate] = useState(false)

  const [resetPwUser, setResetPwUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [resetting, setResetting] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [permissions, setPermissions] = useState<Permission[]>([])
  const [userPermOverrides, setUserPermOverrides] = useState<Map<number, SetUserPermissionRequest[]>>(new Map())
  const [loadingPerms, setLoadingPerms] = useState<Record<number, boolean>>({})
  const [savingPerms, setSavingPerms] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const data = await authService.listUsers()
      setUsers(data)
    } catch {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const data = await authService.getPermissions()
      setPermissions(data)
    } catch {
    }
  }

  useEffect(() => {
    if (hasRole('admin')) {
      fetchUsers()
      fetchPermissions()
    }
  }, [])

  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter((u) => u.is_active).length
    const inactive = total - active
    const roles = new Set(users.map((u) => u.role)).size
    return { total, active, inactive, roles }
  }, [users])

  const filteredUsers = useMemo(() => {
    let result = users.filter(
      (u) =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase()),
    )
    if (statusFilter === 'active') result = result.filter((u) => u.is_active)
    if (statusFilter === 'inactive') result = result.filter((u) => !u.is_active)
    return result
  }, [users, search, statusFilter])

  const handleEdit = (user: User) => {
    setEditUser(user)
    setEditForm({
      email: user.email,
      username: user.username,
      role: user.role,
      warehouse_id: user.warehouse_id,
      is_active: user.is_active,
    })
  }

  const handleSaveEdit = async () => {
    if (!editUser) return
    setSaving(true)
    try {
      const updated = await authService.updateUser(editUser.user_id, editForm)
      setUsers((prev) => prev.map((u) => (u.user_id === updated.user_id ? updated : u)))
      toast.success('Usuario actualizado')
      setEditUser(null)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      const updated = await authService.toggleUserActive(user.user_id)
      setUsers((prev) => prev.map((u) => (u.user_id === updated.user_id ? updated : u)))
      toast.success(updated.is_active ? 'Usuario activado' : 'Usuario desactivado')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al cambiar estado')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await authService.deleteUser(deleteConfirm.user_id)
      setUsers((prev) => prev.filter((u) => u.user_id !== deleteConfirm.user_id))
      toast.success('Usuario eliminado')
      setDeleteConfirm(null)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetPwUser) return
    if (!newPassword || newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setResetting(true)
    try {
      await authService.resetUserPassword(resetPwUser.user_id, newPassword)
      toast.success('Contraseña restablecida')
      setResetPwUser(null)
      setNewPassword('')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al restablecer')
    } finally {
      setResetting(false)
    }
  }

  const loadUserPerms = async (userId: number) => {
    if (userPermOverrides.has(userId)) return
    setLoadingPerms((prev) => ({ ...prev, [userId]: true }))
    try {
      const data = await authService.getUserPermissions(userId)
      const perms: SetUserPermissionRequest[] = permissions.map((p) => ({
        permission_id: p.permission_id,
        granted: data.permissions.includes(`${p.module}.${p.action}`),
      }))
      setUserPermOverrides((prev) => new Map(prev).set(userId, perms))
    } catch {
    } finally {
      setLoadingPerms((prev) => ({ ...prev, [userId]: false }))
    }
  }

  const toggleUserPerm = (userId: number, permId: number) => {
    setUserPermOverrides((prev) => {
      const next = new Map(prev)
      const perms = [...(next.get(userId) || [])]
      const idx = perms.findIndex((p) => p.permission_id === permId)
      if (idx >= 0) {
        perms[idx] = { ...perms[idx], granted: !perms[idx].granted }
      }
      next.set(userId, perms)
      return next
    })
  }

  const saveUserPermissions = async (userId: number) => {
    const perms = userPermOverrides.get(userId)
    if (!perms) return
    setSavingPerms(true)
    try {
      const data = await authService.setUserPermissions(userId, perms)
      const updatedPerms: SetUserPermissionRequest[] = permissions.map((p) => ({
        permission_id: p.permission_id,
        granted: data.permissions.includes(`${p.module}.${p.action}`),
      }))
      setUserPermOverrides((prev) => new Map(prev).set(userId, updatedPerms))
      toast.success('Permisos actualizados')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al guardar permisos')
    } finally {
      setSavingPerms(false)
    }
  }

  const groupedPermissions = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const p of permissions) {
      if (!map.has(p.module)) map.set(p.module, [])
      map.get(p.module)!.push(p)
    }
    return map
  }, [permissions])

  const statCards = [
    { label: 'Total Usuarios', value: stats.total, icon: <UsersIcon className="w-4 h-4" />, color: 'text-white', iconBg: 'bg-nikeOrange/10 border border-nikeOrange/20 text-nikeOrange' },
    { label: 'Activos', value: stats.active, icon: <Activity className="w-4 h-4" />, color: 'text-green-400', iconBg: 'bg-green-500/10 border border-green-500/20 text-green-400' },
    { label: 'Roles', value: stats.roles, icon: <Shield className="w-4 h-4" />, color: 'text-blue-400', iconBg: 'bg-blue-500/10 border border-blue-500/20 text-blue-400' },
    { label: 'Inactivos', value: stats.inactive, icon: <Clock className="w-4 h-4" />, color: 'text-red-400', iconBg: 'bg-red-500/10 border border-red-500/20 text-red-400' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 lg:space-y-5"
    >
      <motion.div variants={sectionVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
        {statCards.map((s, i) => (
          <MetricCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            color={s.color}
            iconBg={s.iconBg}
            index={i}
            compact
            animate
          />
        ))}
      </motion.div>

      <motion.div variants={sectionVariants}>
        <Card
          title="Gestión de Usuarios"
          icon={<UsersIcon className="w-5 h-5 text-nikeOrange" />}
          action={
            <div className="flex items-center gap-2">
              <Can module="users" action="create">
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Nuevo
                </Button>
              </Can>
              <button
                onClick={fetchUsers}
                className="text-xs text-nikeOrange hover:text-white transition-colors uppercase font-bold tracking-wider flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refrescar
              </button>
            </div>
          }
        >
          <div className="mb-4 space-y-3">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por username, email o rol..."
              icon={<Search className="w-4 h-4" />}
            />
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-white/30 shrink-0" />
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs">Todos ({stats.total})</TabsTrigger>
                  <TabsTrigger value="active" className="text-xs">Activos ({stats.active})</TabsTrigger>
                  <TabsTrigger value="inactive" className="text-xs">Inactivos ({stats.inactive})</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {loading ? (
            <Loader label="Cargando usuarios..." />
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">
              No hay usuarios o no coinciden con la búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                    <th className="py-3 px-2 w-8"></th>
                    <th className="py-3 px-2">Usuario</th>
                    <th className="py-3 px-2 hidden sm:table-cell">Email</th>
                    <th className="py-3 px-2">Rol</th>
                    <th className="py-3 px-2">Estado</th>
                    <th className="py-3 px-2 text-right">Creado</th>
                    <th className="py-3 px-2 text-right w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const role = roleConfig[user.role] || roleConfig.operador
                    const isExpanded = expandedId === user.user_id
                    return (
                      <React.Fragment key={user.user_id}>
                        <motion.tr
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td
                            className="py-3 px-2 cursor-pointer"
                            onClick={() => {
                              const next = isExpanded ? null : user.user_id
                              setExpandedId(next)
                              if (next) loadUserPerms(next)
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-white/40" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-white/20" />
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-nikeOrange/20 border border-nikeOrange/30 flex items-center justify-center text-nikeOrange font-bold text-xs shrink-0">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-semibold text-white/90">
                                  {user.username}
                                </span>
                                {user.user_id === currentUser?.user_id && (
                                  <span className="ml-2 text-[10px] text-nikeOrange">(Tú)</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-white/60 text-xs hidden sm:table-cell">
                            {user.email}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant="secondary" className={role.color}>
                              {role.icon}
                              {role.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            {user.is_active ? (
                              <Badge variant="success">Activo</Badge>
                            ) : (
                              <Badge variant="danger">Inactivo</Badge>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right text-xs text-white/40 font-mono">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Can module="users" action="edit">
                                <button
                                  onClick={() => handleEdit(user)}
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-nikeOrange transition-colors"
                                  title="Editar"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                              </Can>
                              <Can module="users" action="toggle-active">
                                <button
                                  onClick={() => handleToggleActive(user)}
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-yellow-400 transition-colors"
                                  title={user.is_active ? 'Desactivar' : 'Activar'}
                                >
                                  {user.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                                </button>
                              </Can>
                              <Can module="users" action="reset-password">
                                <button
                                  onClick={() => { setResetPwUser(user); setNewPassword('') }}
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-blue-400 transition-colors"
                                  title="Resetear password"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>
                              </Can>
                              <Can module="users" action="delete">
                                <button
                                  onClick={() => setDeleteConfirm(user)}
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </Can>
                            </div>
                          </td>
                        </motion.tr>
                        {isExpanded && (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <td colSpan={7} className="px-2 pb-3">
                              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 ml-6">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                                    Permisos
                                  </span>
                                  <Can module="users" action="manage-permissions">
                                    <Button
                                      size="sm"
                                      onClick={() => saveUserPermissions(user.user_id)}
                                      loading={savingPerms}
                                      className="h-7 text-xs"
                                    >
                                      <Save className="w-3 h-3 mr-1" />
                                      Guardar Permisos
                                    </Button>
                                  </Can>
                                </div>
                                {loadingPerms[user.user_id] ? (
                                  <Loader label="Cargando permisos..." />
                                ) : (
                                  <div
                                    className="grid gap-2"
                                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
                                  >
                                    {Array.from(groupedPermissions.entries()).map(([module, perms]) => {
                                      const userPerms = userPermOverrides.get(user.user_id)
                                      return (
                                        <div key={module} className="bg-black/20 rounded-lg p-2.5">
                                          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1.5 capitalize">
                                            {module}
                                          </p>
                                          <div className="space-y-1">
                                            {perms.map((perm) => {
                                              const isGranted = userPerms?.find(
                                                (up) => up.permission_id === perm.permission_id
                                              )?.granted ?? false
                                              return (
                                                <Can key={perm.permission_id} module="users" action="manage-permissions">
                                                  <button
                                                    onClick={() => toggleUserPerm(user.user_id, perm.permission_id)}
                                                    className={`flex items-center gap-1.5 w-full text-left px-1.5 py-1 rounded-md text-xs transition-colors ${
                                                      isGranted
                                                        ? 'text-green-400 hover:bg-green-500/10'
                                                        : 'text-white/30 hover:bg-white/5'
                                                    }`}
                                                  >
                                                    {isGranted ? (
                                                      <CheckSquare className="w-3 h-3 shrink-0" />
                                                    ) : (
                                                      <Square className="w-3 h-3 shrink-0" />
                                                    )}
                                                    {perm.label}
                                                  </button>
                                                </Can>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>

      {/* ============ CREATE USER DIALOG ============ */}
      {showCreate && (
        <CreateUserDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => { fetchUsers(); setShowCreate(false) }}
        />
      )}

      {/* ============ EDIT USER DIALOG ============ */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Actualiza los datos del usuario</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSaveEdit() }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Username</Label>
                <Input
                  value={editForm.username || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rol</Label>
              <Select
                value={editForm.role || 'operador'}
                onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <Label className="mb-0">Activo</Label>
              <button
                type="button"
                onClick={() => setEditForm((f) => ({ ...f, is_active: !f.is_active }))}
                className={editForm.is_active ? 'text-green-400' : 'text-white/30'}
              >
                {editForm.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
            </div>
            <DialogFooter>
              <Button type="submit" loading={saving}>Guardar Cambios</Button>
              <Button type="button" variant="secondary" onClick={() => setEditUser(null)}>Cancelar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============ RESET PASSWORD DIALOG ============ */}
      <Dialog open={!!resetPwUser} onOpenChange={(open) => { if (!open) { setResetPwUser(null); setNewPassword('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetear Contraseña</DialogTitle>
            <DialogDescription>
              Nueva contraseña para {resetPwUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleResetPassword} loading={resetting}>
                <Key className="w-4 h-4 mr-1" />
                Restablecer
              </Button>
              <Button variant="secondary" onClick={() => { setResetPwUser(null); setNewPassword('') }}>
                Cancelar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ DELETE CONFIRM DIALOG ============ */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Usuario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar a <strong>{deleteConfirm?.username}</strong> ({deleteConfirm?.email})?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">
              Se eliminarán todos los datos asociados al usuario.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleDelete} loading={deleting} className="bg-red-500 hover:bg-red-600">
              <Trash2 className="w-4 h-4 mr-1" />
              Eliminar
            </Button>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

const CreateUserDialog: React.FC<{ onClose: () => void; onCreated: () => void }> = ({
  onClose,
  onCreated,
}) => {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('operador')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !username || !password) {
      setError('Todos los campos son requeridos')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await authService.register({ email, username, password, role })
      toast.success('Usuario creado correctamente')
      onCreated()
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al crear usuario'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Usuario</DialogTitle>
          <DialogDescription>Registra un nuevo usuario en el sistema</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@nike.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Username</Label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="usuario"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" loading={loading}>
              <Plus className="w-4 h-4 mr-1" />
              Crear Usuario
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
