import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from '@tanstack/react-router'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { KeycloakCallback } from './pages/auth/KeycloakCallback'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { InventoryPage } from './pages/dashboard/InventoryPage'
import { TrackingPage } from './pages/dashboard/TrackingPage'
import { ChatbotPage } from './pages/dashboard/ChatbotPage'
import { AuditPage } from './pages/dashboard/AuditPage'
import { UsersPage } from './pages/dashboard/UsersPage'
import { SettingsPage } from './pages/dashboard/SettingsPage'
import { useAuthStore } from './store/useAuthStore'
import type { UserRole } from './types/auth'

const checkAuth = () => {
  const { isAuthenticated } = useAuthStore.getState()
  if (!isAuthenticated) {
    throw redirect({ to: '/login' })
  }
}

const checkRole = (...allowedRoles: UserRole[]) => {
  const { hasRole } = useAuthStore.getState()
  if (!hasRole(...allowedRoles)) {
    throw redirect({ to: '/dashboard' })
  }
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    } else {
      throw redirect({ to: '/login' })
    }
  },
  component: () => null,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
})

const keycloakCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: KeycloakCallback,
})

const dashboardLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'dashboard-layout',
  beforeLoad: () => {
    checkAuth()
  },
  component: () => (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  ),
})

const dashboardRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const inventoryRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/inventory',
  component: InventoryPage,
})

const trackingRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/tracking',
  beforeLoad: () => {
    checkRole('admin', 'supervisor')
  },
  component: TrackingPage,
})

const chatbotRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/chatbot',
  component: ChatbotPage,
})

const productsRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/products',
  beforeLoad: () => {
    throw redirect({ to: '/inventory' })
  },
  component: () => null,
})

const productsListRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/products/list',
  beforeLoad: () => {
    throw redirect({ to: '/inventory' })
  },
  component: () => null,
})

const productDetailRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/products/$id',
  beforeLoad: () => {
    throw redirect({ to: '/inventory' })
  },
  component: () => null,
})

const productEditRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/products/$id/edit',
  beforeLoad: () => {
    throw redirect({ to: '/inventory' })
  },
  component: () => null,
})

const auditRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/audit',
  beforeLoad: () => {
    checkRole('admin', 'supervisor')
  },
  component: AuditPage,
})

const usersRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/users',
  beforeLoad: () => {
    checkRole('admin')
  },
  component: UsersPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/settings',
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  keycloakCallbackRoute,
  dashboardLayoutRoute.addChildren([
    dashboardRoute,
    inventoryRoute,
    trackingRoute,
    productsRoute,
    productsListRoute,
    productDetailRoute,
    productEditRoute,
    chatbotRoute,
    auditRoute,
    usersRoute,
    settingsRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
