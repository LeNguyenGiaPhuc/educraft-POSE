import { useState, type FormEvent } from 'react'
import { ArrowRight, BookOpen, Check, Eye, EyeOff, Sparkles } from 'lucide-react'
import { ApiError } from '../lib/api/client'

type Props = { onApiSignIn: (username: string, password: string) => Promise<void> }

export function LoginPage({ onApiSignIn }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onApiSignIn(username.trim(), password)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : reason instanceof Error ? reason.message : 'Đăng nhập thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
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
      <section className="login-side"><div className="login-card">
        <div className="login-mobile-brand"><span className="brand-mark">e<span>.</span></span> educraft</div>
        <span className="small-label">CHÀO MỪNG TRỞ LẠI</span><h2>Đăng nhập</h2><p className="login-intro">Tiếp tục hành trình học tập của bạn.</p>
        <div className="demo-banner"><Sparkles size={17} /><span>Đăng nhập bằng tài khoản EduCraft đã được cấp.</span></div>
        <form onSubmit={submit} noValidate>
          <label htmlFor="username">Tên đăng nhập</label><input id="username" type="text" autoComplete="username" placeholder="Nhập tên đăng nhập" value={username} onChange={(event) => { setUsername(event.target.value); setError('') }} required />
          <label htmlFor="password">Mật khẩu</label><div className="password-field"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} required /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading || !username.trim() || !password}>{loading ? 'Đang đăng nhập…' : <>Đăng nhập <ArrowRight size={18} /></>}</button>
        </form>
      </div><footer>© 2026 EduCraft · Hệ thống học tập</footer></section>
    </div>
  )
}
