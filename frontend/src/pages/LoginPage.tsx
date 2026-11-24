import { useState, type FormEvent } from 'react'
import { ArrowRight, BookOpen, Check, Eye, EyeOff, Sparkles } from 'lucide-react'
import { authenticateDemo, demoUsers, type DemoUser } from '../data/demo'
import { roleNames } from '../data/navigation'
import { ApiError } from '../lib/api/client'

type Props = {
  onSignIn: (user: DemoUser) => void
  onApiSignIn: (username: string, password: string) => Promise<void>
}

export function LoginPage({ onSignIn, onApiSignIn }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const previewUser = authenticateDemo(username, password)
    if (previewUser?.role === 'student') {
      setError('')
      onSignIn(previewUser)
      return
    }

    setIsSubmitting(true)
    try {
      await onApiSignIn(username.trim(), password)
      setError('')
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Đăng nhập không thành công. Hãy thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-layout">
      <section className="login-story">
        <div className="story-top"><span className="brand-mark">e<span>.</span></span><span className="story-brand">educraft <small>LEARNING SPACE</small></span></div>
        <div className="story-center"><span className="story-kicker"><Sparkles size={15} /> MỘT KHÔNG GIAN HỌC TẬP MỚI</span><h1>Mỗi bài học<br />là một bước <em>tiến.</em></h1><p>Giúp giáo viên chuẩn bị tốt hơn, học sinh hiểu bài sâu hơn và mỗi tiến bộ đều được nhìn thấy.</p><div className="story-line" /><div className="story-features"><span><Check size={17} /> Học trước khi đến lớp</span><span><Check size={17} /> Hoạt động phù hợp</span><span><Check size={17} /> Theo dõi hành trình học</span></div></div>
        <div className="story-bottom"><BookOpen size={18} /> EduCraft · Học theo cách của bạn</div>
        <div className="orb orb-one" /><div className="orb orb-two" />
      </section>
      <section className="login-side"><div className="login-card"><div className="login-mobile-brand"><span className="brand-mark">e<span>.</span></span> educraft</div><span className="small-label">CHÀO MỪNG TRỞ LẠI</span><h2>Đăng nhập</h2><p className="login-intro">Tiếp tục hành trình học tập của bạn.</p><div className="demo-banner"><Sparkles size={17} /><span>Admin và Teacher đăng nhập qua backend. Student vẫn có tài khoản mô phỏng để xem UI.</span></div><form onSubmit={submit} noValidate><label htmlFor="username">Tên đăng nhập</label><input id="username" type="text" autoComplete="username" placeholder="Nhập tên đăng nhập" value={username} onChange={(event) => { setUsername(event.target.value); setError('') }} required /><label htmlFor="password">Mật khẩu</label><div className="password-field"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} required /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'} {!isSubmitting && <ArrowRight size={18} />}</button></form><div className="demo-divider"><span>HOẶC CHỌN TÀI KHOẢN MẪU</span></div><div className="demo-accounts">{demoUsers.map((user) => <button key={user.role} type="button" className="demo-account" onClick={() => { setUsername(user.email); setPassword('demo123'); setError('') }}><span className={`demo-avatar ${user.role}`}>{user.initials}</span><span><strong>{roleNames[user.role]}</strong><small>{user.email}</small></span><ArrowRight size={16} /></button>)}</div><p className="demo-password">Chọn Student để mở bản mô phỏng; Admin/Teacher dùng tài khoản backend.</p></div><footer>© 2026 EduCraft · Học theo cách của bạn</footer></section>
    </div>
  )
}
