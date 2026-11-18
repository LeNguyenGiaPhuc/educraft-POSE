export const ACCOUNT_PASSWORD_MIN_LENGTH = 8
export const ACCOUNT_PASSWORD_MAX_LENGTH = 128

const fullNamePattern = /^[\p{L}]+(?:[ '’-][\p{L}]+)*$/u
const usernamePattern = /^[a-z0-9._-]+$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const mobilePattern = /^(03|05|07|08|09)\d{8}$/

export function normalizeFullName(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ')
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizeContact(value: string): string {
  const trimmed = value.trim()
  if (trimmed.includes('@')) {
    const atIndex = trimmed.lastIndexOf('@')
    return `${trimmed.slice(0, atIndex)}@${trimmed.slice(atIndex + 1).toLowerCase()}`
  }

  const compact = trimmed.replace(/[\s.()-]/g, '')
  return compact.startsWith('+84') ? `0${compact.slice(3)}` : compact
}

export function validateFullName(value: string): string | null {
  const normalized = normalizeFullName(value)
  if (!normalized) return 'Họ và tên không được để trống.'
  const length = Array.from(normalized).length
  if (length < 2 || length > 100) return 'Họ và tên phải có từ 2 đến 100 ký tự.'
  if (!fullNamePattern.test(normalized)) {
    return 'Họ và tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy đơn hoặc dấu gạch nối.'
  }
  return null
}

export function validateUsername(value: string): string | null {
  const normalized = normalizeUsername(value)
  if (normalized.length < 3 || normalized.length > 50) {
    return 'Tên đăng nhập phải có từ 3 đến 50 ký tự.'
  }
  if (!usernamePattern.test(normalized)) {
    return 'Tên đăng nhập chỉ được chứa chữ cái không dấu, chữ số, dấu chấm, gạch dưới hoặc gạch nối.'
  }
  if (!/^[a-z0-9].*[a-z0-9]$|^[a-z0-9]$/.test(normalized)) {
    return 'Tên đăng nhập phải bắt đầu và kết thúc bằng chữ cái hoặc chữ số.'
  }
  if (/[._-]{2}/.test(normalized)) {
    return 'Tên đăng nhập không được có hai dấu phân cách liên tiếp.'
  }
  return null
}

export function validateContact(value: string): string | null {
  const normalized = normalizeContact(value)
  if (!normalized) return 'Thông tin liên hệ không được để trống.'
  if (normalized.includes('@')) {
    return emailPattern.test(normalized) ? null : 'Email liên hệ không hợp lệ.'
  }
  if (!/^\+?[0-9.()\-\s]+$/.test(value.trim())) return 'Thông tin liên hệ không hợp lệ.'
  return mobilePattern.test(normalized) ? null : 'Số điện thoại phải là số di động Việt Nam 10 chữ số.'
}

export function validatePassword(value: string): string | null {
  if (value.length < ACCOUNT_PASSWORD_MIN_LENGTH || value.length > ACCOUNT_PASSWORD_MAX_LENGTH) {
    return 'Mật khẩu phải có từ 8 đến 128 ký tự.'
  }
  return null
}
