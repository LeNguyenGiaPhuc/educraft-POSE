import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Check, CheckCircle2, CircleHelp, Filter, Plus, Search, ShieldCheck, UserRound, Users, X } from 'lucide-react'
import { accounts, getClassroom, getSubject, subjects, type AccountRole, type AccountStatus, type AdminAccount } from '../fixtures'
import { accountDraftFrom, emptyAccountDraft, validateAccountDraft, type AccountDraft } from './accounts.mock'

type ModalMode = 'create' | 'edit' | null

export function AccountsPage() {
  const [accountList, setAccountList] = useState<AdminAccount[]>(() => [...accounts])
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<AccountRole | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'ALL'>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(accounts[0].id)
  const [draft, setDraft] = useState<AccountDraft>(emptyAccountDraft)
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')

  // Scroll lock and Escape listener when modal is open
  useEffect(() => {
    if (!modalMode) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setModalMode(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [modalMode])

  const visible = useMemo(() => accountList.filter((account) => {
    const term = search.trim().toLocaleLowerCase()
    return (roleFilter === 'ALL' || account.role === roleFilter)
      && (statusFilter === 'ALL' || account.status === statusFilter)
      && (!term || `${account.fullName} ${account.username}`.toLocaleLowerCase().includes(term))
  }), [accountList, search, roleFilter, statusFilter])
  const selected = visible.find((account) => account.id === selectedId) ?? visible[0] ?? null

  function startCreate() {
    setDraft(emptyAccountDraft)
    setPassword('')
    setErrors([])
    setModalMode('create')
  }
  function startEdit(account: AdminAccount) {
    setSelectedId(account.id)
    setDraft(accountDraftFrom(account))
    setPassword('')
    setErrors([])
    setModalMode('edit')
  }
  function closeModal() {
    setModalMode(null)
    setPassword('')
    setErrors([])
  }

  function handleSubmitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = validateAccountDraft(draft, modalMode === 'edit' ? selectedId ?? undefined : undefined)
    if (modalMode === 'create' && !password.trim()) {
      next.push('Mật khẩu không được để trống.')
    }
    if (next.length > 0) {
      setErrors(next)
      return
    }

    setErrors([])
    if (modalMode === 'create') {
      const newId = `acc-${Date.now()}`
      const newAccount: AdminAccount = {
        id: newId,
        username: draft.username.trim(),
        fullName: draft.fullName.trim(),
        role: draft.role,
        status: 'ACTIVE',
        contact: draft.contact.trim(),
        classroomId: null,
        qualification: draft.role === 'TEACHER' ? draft.qualification.trim() : undefined,
        specializedSubjectId: draft.role === 'TEACHER' ? draft.specializedSubjectId : undefined,
        passwordChangedAt: new Date().toISOString(),
      }
      setAccountList((current) => [newAccount, ...current])
      setSelectedId(newId)
      setModalMode(null) // Form disappears!
      setMessage(`Đã tạo tài khoản “${newAccount.fullName}” (@${newAccount.username}) thành công.`)
    } else if (modalMode === 'edit' && selectedId) {
      setAccountList((current) =>
        current.map((item) =>
          item.id === selectedId
            ? {
                ...item,
                fullName: draft.fullName.trim(),
                username: draft.username.trim(),
                contact: draft.contact.trim(),
                qualification: item.role === 'TEACHER' ? draft.qualification.trim() : undefined,
                specializedSubjectId: item.role === 'TEACHER' ? draft.specializedSubjectId : undefined,
              }
            : item
        )
      )
      setModalMode(null) // Form disappears!
      setMessage(`Đã cập nhật thông tin tài khoản “${draft.fullName.trim()}” thành công.`)
    }
  }

  return (
    <div className="page-content adm-page">
      <div className="page-heading">
        <span className="eyebrow"><span className="eyebrow-line" /> QUẢN TRỊ HỆ THỐNG</span>
        <h1>Tài khoản</h1>
        <p>Quản lý tài khoản giáo viên và học sinh. Tài khoản học sinh có thể được tạo trước khi phân lớp.</p>
      </div>

      <div className="adm-notice">
        <ShieldCheck size={17} />
        <span>Dữ liệu đang hiển thị là ví dụ. Mọi thay đổi ở màn hình này chỉ được xem trước, chưa lưu vào hệ thống.</span>
      </div>

      {message && (
        <div className="adm-notice" style={{ background: '#eef8ef', borderColor: '#c4e3c5', color: '#276239', marginBottom: 16 }} role="status">
          <CheckCircle2 size={17} style={{ color: '#2b7843' }} />
          <span>{message}</span>
        </div>
      )}

      <div className="adm-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong style={{ fontSize: 13, color: '#33503f' }}>Danh sách tài khoản</strong>
          <span style={{ fontSize: 12, background: '#eaf0e8', color: '#436952', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
            {visible.length} tài khoản
          </span>
        </div>
        <button type="button" className="adm-primary" onClick={startCreate}>
          <Plus size={17} /> Tạo tài khoản
        </button>
      </div>

      <div className="adm-layout">
        <section className="adm-card">
          <div className="adm-card-head">
            <div>
              <span className="section-kicker">DANH SÁCH</span>
              <h2>Giáo viên & học sinh <small>{visible.length}</small></h2>
            </div>
            <Users size={19} />
          </div>

          <div className="adm-filters">
            <label className="adm-search">
              <Search size={17} />
              <span className="sr-only">Tìm tài khoản</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên hoặc tên đăng nhập" />
            </label>
            <label className="adm-filter">
              <Filter size={16} />
              <span className="sr-only">Lọc vai trò</span>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as AccountRole | 'ALL')}>
                <option value="ALL">Mọi vai trò</option>
                <option value="TEACHER">Giáo viên</option>
                <option value="STUDENT">Học sinh</option>
              </select>
            </label>
            <label className="adm-filter">
              <span className="sr-only">Lọc trạng thái</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AccountStatus | 'ALL')}>
                <option value="ALL">Mọi trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Ngừng hoạt động</option>
              </select>
            </label>
          </div>

          {visible.length === 0 ? (
            <div className="adm-empty">
              <UserRound size={30} />
              <strong>Không tìm thấy tài khoản</strong>
              <p>Thử đổi từ khóa hoặc bộ lọc.</p>
            </div>
          ) : (
            <div className="adm-list">
              {visible.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className={`adm-row ${selected?.id === account.id ? 'is-selected' : ''}`}
                  onClick={() => { setSelectedId(account.id); setMessage('') }}
                >
                  <span className={`adm-avatar ${account.role === 'TEACHER' ? 'is-teacher' : ''}`}>
                    {account.fullName.split(' ').slice(-2).map((part) => part[0]).join('')}
                  </span>
                  <span className="adm-row-copy">
                    <strong>{account.fullName}</strong>
                    <small>@{account.username} · {account.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'}</small>
                  </span>
                  <span className={`adm-status ${account.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                    {account.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                  </span>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="adm-card adm-detail">
          {selected ? (
            <>
              <div className="adm-card-head">
                <div>
                  <span className="section-kicker">CHI TIẾT TÀI KHOẢN</span>
                  <h2>{selected.fullName}</h2>
                </div>
                <span className={`adm-avatar ${selected.role === 'TEACHER' ? 'is-teacher' : ''}`}>
                  {selected.fullName.split(' ').slice(-2).map((part) => part[0]).join('')}
                </span>
              </div>
              <dl className="adm-facts">
                <div><dt>Tên đăng nhập</dt><dd>{selected.username}</dd></div>
                <div><dt>Vai trò</dt><dd>{selected.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'}</dd></div>
                <div><dt>Liên hệ</dt><dd>{selected.contact}</dd></div>
                {selected.role === 'TEACHER' ? (
                  <>
                    <div><dt>Bằng cấp</dt><dd>{selected.qualification}</dd></div>
                    <div><dt>Môn chuyên môn</dt><dd>{getSubject(selected.specializedSubjectId ?? '')?.name}</dd></div>
                  </>
                ) : (
                  <div><dt>Lớp hiện tại</dt><dd>{getClassroom(selected.classroomId)?.name ?? <span className="adm-unassigned">Chưa có lớp</span>}</dd></div>
                )}
              </dl>
              <div className="adm-actions">
                <button type="button" className="adm-secondary" onClick={() => startEdit(selected)}>
                  Chỉnh sửa tài khoản
                </button>
                <button type="button" className="adm-text-button" onClick={() => setMessage(`Chỉ xem trước: thao tác ${selected.status === 'ACTIVE' ? 'ngừng hoạt động' : 'kích hoạt lại'} chưa được thực hiện.`)}>
                  {selected.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
                </button>
                <button type="button" className="adm-text-button" onClick={() => setMessage('Chỉ xem trước: chưa gửi yêu cầu đặt lại mật khẩu và không tạo mật khẩu tạm.')}>
                  Đặt lại mật khẩu
                </button>
              </div>
            </>
          ) : (
            <div className="adm-empty">
              <CircleHelp size={27} />
              <p>Chọn tài khoản để xem chi tiết.</p>
            </div>
          )}
        </aside>
      </div>

      {/* Modal Popup Form (Tạo mới & Chỉnh sửa tài khoản) */}
      {modalMode && (
        <div
          className="adm-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="adm-modal-window">
            <div className="adm-modal-head">
              <div>
                <span className="adm-modal-eyebrow">POPUP QUẢN TRỊ TÀI KHOẢN</span>
                <h3 id="account-modal-title" className="adm-modal-title">
                  {modalMode === 'create' ? 'Tạo tài khoản mới' : `Chỉnh sửa tài khoản: ${selected?.fullName ?? ''}`}
                </h3>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={closeModal}
                aria-label="Đóng biểu mẫu tài khoản"
                title="Đóng (Escape)"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitAccount} onChange={() => setErrors([])} noValidate>
              <div className="adm-modal-body">
                <div className="adm-form-grid">
                  <label>
                    Vai trò
                    <select
                      value={draft.role}
                      disabled={modalMode === 'edit'}
                      onChange={(event) => setDraft({ ...draft, role: event.target.value as AccountRole })}
                    >
                      <option value="STUDENT">Học sinh</option>
                      <option value="TEACHER">Giáo viên</option>
                    </select>
                  </label>

                  <label>
                    Họ và tên
                    <input
                      required
                      value={draft.fullName}
                      onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}
                      placeholder="Ví dụ: Nguyễn Minh Anh"
                    />
                  </label>

                  <label>
                    Tên đăng nhập
                    <input
                      required
                      value={draft.username}
                      onChange={(event) => setDraft({ ...draft, username: event.target.value })}
                      placeholder="Ví dụ: nguyen.minh.anh"
                    />
                  </label>

                  <label>
                    Thông tin liên hệ
                    <input
                      value={draft.contact}
                      onChange={(event) => setDraft({ ...draft, contact: event.target.value })}
                      placeholder="Email hoặc số liên hệ"
                    />
                  </label>

                  {modalMode === 'create' && (
                    <label>
                      Mật khẩu khởi tạo
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Nhập mật khẩu cho tài khoản"
                      />
                    </label>
                  )}

                  {draft.role === 'TEACHER' && (
                    <>
                      <label>
                        Bằng cấp
                        <input
                          value={draft.qualification}
                          onChange={(event) => setDraft({ ...draft, qualification: event.target.value })}
                          placeholder="Ví dụ: Cử nhân Sư phạm"
                        />
                      </label>
                      <label>
                        Môn học chuyên môn
                        <select
                          value={draft.specializedSubjectId}
                          onChange={(event) => setDraft({ ...draft, specializedSubjectId: event.target.value })}
                        >
                          <option value="">Chọn từ danh mục môn học</option>
                          {subjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                </div>

                {draft.role === 'STUDENT' && (
                  <p className="adm-inline-note" style={{ marginTop: 14 }}>
                    Có thể tạo tài khoản trước. Admin sẽ thêm học sinh vào lớp trong mục Lớp học.
                  </p>
                )}

                {errors.length > 0 && (
                  <div className="adm-errors" role="alert" style={{ marginTop: 14 }}>
                    <strong>Hãy kiểm tra lại:</strong>
                    <ul>
                      {errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="adm-modal-foot">
                <button type="button" className="adm-secondary" onClick={closeModal}>
                  Hủy bỏ
                </button>
                <button type="submit" className="adm-primary">
                  <Check size={16} /> {modalMode === 'create' ? 'Lưu tài khoản' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
