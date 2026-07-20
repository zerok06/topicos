import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { exchangeCodeForToken } from '../../services/keycloak.service'

export const KeycloakCallback: React.FC = () => {
  const navigate = useNavigate()
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error || !code) {
      navigate({ to: '/login' })
      return
    }

    exchangeCodeForToken(code)
      .then((data) => {
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        useAuthStore.setState({
          user: data.user,
          token: data.access_token,
          refreshToken: data.refresh_token,
          isAuthenticated: true,
          isLoading: false,
        })
        navigate({ to: '/dashboard' })
      })
      .catch(() => {
        navigate({ to: '/login' })
      })
  }, [])

  return (
    <div className="min-h-screen bg-command-center flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-nikeOrange animate-spin" />
        <p className="text-sm text-white/60">Autenticando con Keycloak...</p>
      </div>
    </div>
  )
}
