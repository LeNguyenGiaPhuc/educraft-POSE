import { apiRequest } from './client'

export type ApiRole = 'ADMIN' | 'TEACHER' | 'STUDENT'

export type ApiUser = {
  id: string
  username: string
  fullName: string
  role: ApiRole
  contact: string | null
  mustChangePassword: boolean
}

type AuthResponse = {
  user: ApiUser
}

export const authApi = {
  async login(username: string, password: string): Promise<ApiUser> {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { username, password },
    })
    return response.data.user
  },

  async me(): Promise<ApiUser> {
    const response = await apiRequest<AuthResponse>('/auth/me')
    return response.data.user
  },

  async logout(): Promise<void> {
    await apiRequest<{ success: boolean }>('/auth/logout', { method: 'POST' })
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiRequest<{ success: boolean }>('/auth/password', {
      method: 'PATCH',
      body: { currentPassword, newPassword },
    })
  },
}
