export const ACCOUNT_PASSWORD_MIN_LENGTH = 8;
export const ACCOUNT_PASSWORD_MAX_LENGTH = 128;

export type IdentityFieldErrorCode =
  | 'FULL_NAME_REQUIRED'
  | 'FULL_NAME_LENGTH'
  | 'FULL_NAME_CHARACTERS'
  | 'USERNAME_LENGTH'
  | 'USERNAME_CHARACTERS'
  | 'USERNAME_BOUNDARY'
  | 'USERNAME_SEPARATORS'
  | 'CONTACT_REQUIRED'
  | 'CONTACT_EMAIL'
  | 'CONTACT_FORMAT'
  | 'CONTACT_PHONE'
  | 'PASSWORD_LENGTH';

const fullNamePattern = /^[\p{L}]+(?:[ '’-][\p{L}]+)*$/u;
const usernamePattern = /^[a-z0-9._-]+$/;
const usernameBoundaryPattern = /^[a-z0-9].*[a-z0-9]$|^[a-z0-9]$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const vietnameseMobilePattern = /^(03|05|07|08|09)\d{8}$/;

export function normalizeFullName(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function validateFullName(value: string): IdentityFieldErrorCode | null {
  const normalized = normalizeFullName(value);
  if (!normalized) return 'FULL_NAME_REQUIRED';
  const length = Array.from(normalized).length;
  if (length < 2 || length > 100) return 'FULL_NAME_LENGTH';
  if (!fullNamePattern.test(normalized)) return 'FULL_NAME_CHARACTERS';
  return null;
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string): IdentityFieldErrorCode | null {
  const normalized = normalizeUsername(value);
  if (normalized.length < 3 || normalized.length > 50) return 'USERNAME_LENGTH';
  if (!usernamePattern.test(normalized)) return 'USERNAME_CHARACTERS';
  if (!usernameBoundaryPattern.test(normalized)) return 'USERNAME_BOUNDARY';
  if (/[._-]{2}/.test(normalized)) return 'USERNAME_SEPARATORS';
  return null;
}

export function normalizeContact(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes('@')) {
    const atIndex = trimmed.lastIndexOf('@');
    const localPart = trimmed.slice(0, atIndex);
    const domain = trimmed.slice(atIndex + 1).toLowerCase();
    return `${localPart}@${domain}`;
  }

  const compactPhone = trimmed.replace(/[\s.()-]/g, '');
  if (compactPhone.startsWith('+84')) {
    return `0${compactPhone.slice(3)}`;
  }
  return compactPhone;
}

export function validateContact(value: string): IdentityFieldErrorCode | null {
  const normalized = normalizeContact(value);
  if (!normalized) return 'CONTACT_REQUIRED';

  if (normalized.includes('@')) {
    return emailPattern.test(normalized) ? null : 'CONTACT_EMAIL';
  }

  if (!/^\+?[0-9.()\-\s]+$/.test(value.trim())) {
    return 'CONTACT_FORMAT';
  }

  return vietnameseMobilePattern.test(normalized) ? null : 'CONTACT_PHONE';
}

export function validatePassword(value: string): IdentityFieldErrorCode | null {
  if (
    value.length < ACCOUNT_PASSWORD_MIN_LENGTH ||
    value.length > ACCOUNT_PASSWORD_MAX_LENGTH
  ) {
    return 'PASSWORD_LENGTH';
  }
  return null;
}

export function getIdentityErrorMessage(code: IdentityFieldErrorCode): string {
  const messages: Record<IdentityFieldErrorCode, string> = {
    FULL_NAME_REQUIRED: 'Họ và tên không được để trống.',
    FULL_NAME_LENGTH: 'Họ và tên phải có từ 2 đến 100 ký tự.',
    FULL_NAME_CHARACTERS: 'Họ và tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy đơn hoặc dấu gạch nối.',
    USERNAME_LENGTH: 'Tên đăng nhập phải có từ 3 đến 50 ký tự.',
    USERNAME_CHARACTERS: 'Tên đăng nhập chỉ được chứa chữ cái không dấu, chữ số, dấu chấm, gạch dưới hoặc gạch nối.',
    USERNAME_BOUNDARY: 'Tên đăng nhập phải bắt đầu và kết thúc bằng chữ cái hoặc chữ số.',
    USERNAME_SEPARATORS: 'Tên đăng nhập không được có hai dấu phân cách liên tiếp.',
    CONTACT_REQUIRED: 'Thông tin liên hệ không được để trống.',
    CONTACT_EMAIL: 'Email liên hệ không hợp lệ.',
    CONTACT_FORMAT: 'Thông tin liên hệ không hợp lệ.',
    CONTACT_PHONE: 'Số điện thoại phải là số di động Việt Nam 10 chữ số.',
    PASSWORD_LENGTH: 'Mật khẩu phải có từ 8 đến 128 ký tự.',
  };
  return messages[code];
}
