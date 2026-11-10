export const classScenarios = {
  assigned: 'Lớp được phân công',
  empty: 'Chưa có lớp',
  revoked: 'Phân công đã thay đổi',
} as const

export type ClassScenario = keyof typeof classScenarios
