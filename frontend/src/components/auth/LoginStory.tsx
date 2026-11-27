import { BookOpen, Check } from 'lucide-react'
import craftSpark from '../../assets/educraft/brand/craft-spark.svg'
import logomark from '../../assets/educraft/brand/logomark.svg'
import wordmark from '../../assets/educraft/brand/wordmark-only.svg'
import books from '../../assets/educraft/illustrations/books.svg'
import curiosity from '../../assets/educraft/illustrations/curiosity.svg'
import notebook from '../../assets/educraft/illustrations/notebook.svg'

export function LoginStory() {
  return (
    <section className="auth-story" aria-labelledby="auth-story-title">
      <div className="auth-brand">
        <img className="auth-logomark" src={logomark} alt="" />
        <img className="auth-wordmark" src={wordmark} alt="EduCraft" />
      </div>

      <div className="auth-story-copy">
        <h1 id="auth-story-title"><span>Dạy sáng tạo.</span><strong>Học chủ động.</strong></h1>
        <p>Không gian học tập giúp giáo viên chuẩn bị tốt hơn và học sinh nhìn thấy từng bước tiến của mình.</p>
        <ul>
          <li><Check size={18} aria-hidden="true" /> Học trước khi đến lớp</li>
          <li><Check size={18} aria-hidden="true" /> Hoạt động phù hợp</li>
          <li><Check size={18} aria-hidden="true" /> Theo dõi hành trình học</li>
        </ul>
      </div>

      <div className="auth-story-art" aria-hidden="true">
        <img className="auth-art-notebook" src={notebook} alt="" />
        <img className="auth-art-curiosity" src={curiosity} alt="" />
        <img className="auth-art-books" src={books} alt="" />
        <img className="auth-art-spark" src={craftSpark} alt="" />
      </div>
      <p className="auth-story-foot"><BookOpen size={18} aria-hidden="true" /> EduCraft · Học theo cách của bạn</p>
    </section>
  )
}
