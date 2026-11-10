import { useState, type FormEvent } from 'react'
import { ArrowRight, BookOpen, Check, Eye, EyeOff, Sparkles } from 'lucide-react'
import { authenticateDemo, demoUsers, type DemoUser } from '../data/demo'
import { roleNames } from '../data/navigation'

type Props = { onSignIn: (user: DemoUser) => void }

export function LoginPage({ onSignIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const user = authenticateDemo(email, password)
    if (!user) {
      setError('Email hoặc mật khẩu demo chưa đúng. Hãy chọn một tài khoản bên dưới.')
      return
    }
    setError('')
    onSignIn(user)
  }

  return (
    <div className="login-layout">
      <section className="login-story">
        <div className="story-top"><span className="brand-mark">e<span>.</span></span><span className="story-brand">educraft <small>LEARNING SPACE</small></span></div>
        <div className="story-center"><span className="story-kicker"><Sparkles size={15} /> MỘT KHÔNG GIAN HỌC TẬP MỚI</span><h1>Mỗi bài học<br />là một bước <em>tiến.</em></h1><p>Giúp giáo viên chuẩn bị tốt hơn, học sinh hiểu bài sâu hơn và mỗi tiến bộ đều được nhìn thấy.</p><div className="story-line" /><div className="story-features"><span><Check size={17} /> Học trước khi đến lớp</span><span><Check size={17} /> Hoạt động phù hợp</span><span><Check size={17} /> Theo dõi hành trình học</span></div></div>
        <div className="story-bottom"><BookOpen size={18} /> EduCraft · Học theo cách của bạn</div>
        <div className="orb orb-one" /><div className="orb orb-two" />
      </section>
      <section className="login-side"><div className="login-card"><div className="login-mobile-brand"><span className="brand-mark">e<span>.</span></span> educraft</div><span className="small-label">CHÀO MỪNG TRỞ LẠI</span><h2>Đăng nhập</h2><p className="login-intro">Tiếp tục hành trình học tập của bạn.</p><div className="demo-banner"><Sparkles size={17} /><span>Đây là bản xem trước. Đăng nhập bằng tài khoản mẫu bên dưới; chưa kết nối hệ thống thật.</span></div><form onSubmit={submit} noValidate><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" placeholder="ten@educraft.vn" value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} required /><label htmlFor="password">Mật khẩu</label><div className="password-field"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} required /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit">Đăng nhập <ArrowRight size={18} /></button></form><div className="demo-divider"><span>HOẶC CHỌN TÀI KHOẢN MẪU</span></div><div className="demo-accounts">{demoUsers.map((user) => <button key={user.role} type="button" className="demo-account" onClick={() => { setEmail(user.email); setPassword('demo123'); setError('') }}><span className={`demo-avatar ${user.role}`}>{user.initials}</span><span><strong>{roleNames[user.role]}</strong><small>{user.email}</small></span><ArrowRight size={16} /></button>)}</div><p className="demo-password">Mật khẩu cho cả ba tài khoản: <code>demo123</code></p></div><footer>© 2026 EduCraft · Bản xem trước giao diện</footer></section>
    </div>
  )
}
