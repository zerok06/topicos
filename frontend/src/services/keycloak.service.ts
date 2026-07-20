import api from './api'

const KC_ENABLED = import.meta.env.VITE_KEYCLOAK_ENABLED === 'true'
const KC_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080'
const KC_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'nike'
const KC_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'nike-backend'

export const keycloakConfig = {
  enabled: KC_ENABLED,
  url: KC_URL,
  realm: KC_REALM,
  clientId: KC_CLIENT_ID,
  redirectUri: `${window.location.origin}/auth/callback`,
}

export function buildAuthorizationUrl(): string {
  const params = new URLSearchParams({
    client_id: keycloakConfig.clientId,
    redirect_uri: keycloakConfig.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
  })
  return `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/auth?${params}`
}

export async function exchangeCodeForToken(code: string): Promise<{ access_token: string; refresh_token: string; user: any }> {
  const res = await api.post('/auth/keycloak/exchange', {
    code,
    redirect_uri: keycloakConfig.redirectUri,
  })
  return res.data
}
