import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, Info } from 'lucide-react'
import { LoginStory } from '../components/auth/LoginStory'
import { ConnectedAction } from '../design-system/ConnectedAction'
import { Feedback } from '../design-system/Feedback'
import { Field } from '../design-system/Field'
import { authenticateDemo, demoUsers, type DemoUser } from '../data/demo'
import { roleNames } from '../data/navigation'
import { ApiError } from '../lib/api/client'
import { validateLoginCredentials, type LoginValidationErrors } from '../lib/auth/loginValidation'

type Props = {
  onSignIn: (user: DemoUser) => void
  onApiSignIn: (username: string, password: string) => Promise<void>
}

export function LoginPage({ onSignIn, onApiSignIn }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<LoginValidationErrors>({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function clearError(field: keyof LoginValidationErrors) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  function selectDemoAccount(user: DemoUser) {
    setUsername(user.email)
    setPassword('demo123')
    setFieldErrors({})
    setFormError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationErrors = validateLoginCredentials(username, password)
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setFormError('')
      return
    }

    const previewUser = authenticateDemo(username, password)
    if (previewUser?.role === 'student') {
      setFieldErrors({})
      setFormError('')
      onSignIn(previewUser)
      return
    }

    setIsSubmitting(true)
    try {
      await onApiSignIn(username.trim(), password)
      setFieldErrors({})
      setFormError('')
    } catch (caughtError) {
      const message = caughtError instanceof ApiError
        ? caughtError.message
        : 'Đăng nhập không thành công. Hãy kiểm tra kết nối và thử lại.'
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-layout auth-login">
      <LoginStory />

      <main className="auth-panel">
        <div className="auth-card">
          <h2>Chào mừng trở lại.</h2>
          <p className="auth-intro">Đăng nhập để tiếp tục không gian học tập của bạn.</p>

          <form onSubmit={submit} noValidate>
            <Field
              id="username"
              label="Tên đăng nhập"
              autoComplete="username"
              placeholder="Nhập tên đăng nhập"
              value={username}
              error={fieldErrors.username}
              disabled={isSubmitting}
              required
              onChange={(event) => {
                setUsername(event.target.value)
                clearError('username')
              }}
            />

            <div className="auth-password-field">
              <Field
                id="password"
                label="Mật khẩu"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                value={password}
                error={fieldErrors.password}
                disabled={isSubmitting}
                required
                onChange={(event) => {
                  setPassword(event.target.value)
                  clearError('password')
                }}
              >
                <button
                  className="auth-password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  disabled={isSubmitting}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </Field>
            </div>

            {formError && <Feedback kind="error">{formError}</Feedback>}

            <ConnectedAction className="auth-submit" type="submit" loading={isSubmitting} markIcon={<ArrowRight size={17} />}>
              {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </ConnectedAction>
          </form>

          <div className="auth-divider"><span>Hoặc chọn tài khoản mẫu</span></div>
          <div className="auth-demo-note">
            <Info size={18} aria-hidden="true" />
            <span>Quản trị viên và giáo viên dùng tài khoản hệ thống. Học sinh có thể dùng tài khoản mẫu để xem giao diện.</span>
          </div>
          <div className="auth-demo-accounts">
            {demoUsers.map((user) => (
              <button key={user.role} type="button" className="auth-demo-account" onClick={() => selectDemoAccount(user)}>
                <span className={`auth-demo-avatar ${user.role}`}>{user.initials}</span>
                <span className="auth-demo-copy"><strong>{roleNames[user.role]}</strong><small>{user.email}</small></span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className="auth-demo-help">Chọn tài khoản để tự điền thông tin, sau đó nhấn Đăng nhập.</p>
        </div>
        <footer>© 2026 EduCraft · Học theo cách của bạn</footer>
      </main>
    </div>
  )
}
