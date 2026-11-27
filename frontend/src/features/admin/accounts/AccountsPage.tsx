import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CircleHelp, Plus } from 'lucide-react'
import { accountDraftFrom, emptyAccountDraft, normalizeAccountDraft, validateAccountDraft, type AccountDraft } from './accountForm'
import { validatePassword } from '../../../lib/accountIdentity'
import { PasswordResetDialog } from './PasswordResetDialog'
import { AccountFormDialog } from './AccountFormDialog'
import { AccountPreviewDialog } from './AccountPreviewDialog'
import { AccountFilters } from './AccountFilters'
import { AccountsTable } from './AccountsTable'
import { adminApi, type AdminAccount, type AdminSubject } from '../../../lib/api/admin'
import { ApiError } from '../../../lib/api/client'

type ModalMode = 'create' | 'edit' | null
type AccountRole = Exclude<AdminAccount['role'], 'ADMIN'>
type AccountStatus = AdminAccount['status']

export function AccountsPage() {
  const [accountList, setAccountList] = useState<AdminAccount[]>([])
  const [subjectList, setSubjectList] = useState<AdminSubject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<AccountRole | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'ALL'>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<AccountDraft>(emptyAccountDraft)
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [passwordResetAccount, setPasswordResetAccount] = useState<AdminAccount | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [accountPreview, setAccountPreview] = useState<{ draft: AccountDraft; password: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      adminApi.listAccounts({ page: 1, limit: 100 }),
      adminApi.listSubjects(),
    ])
      .then(([accountResult, subjects]) => {
        if (cancelled) return
        const managedAccounts = accountResult.items.filter((account) => account.role !== 'ADMIN')
        setAccountList(managedAccounts)
        setSubjectList(subjects)
        setSelectedId(managedAccounts[0]?.id ?? null)
        setLoadError('')
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof ApiError ? error.message : 'Không thể tải danh sách tài khoản.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

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
    setAccountPreview(null)
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
    setAccountPreview(null)
    setModalMode(null)
    setPassword('')
    setErrors([])
  }

  async function handleSubmitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedDraft = normalizeAccountDraft(draft)
    const next = validateAccountDraft(
      normalizedDraft,
      accountList,
      modalMode === 'edit' ? selectedId ?? undefined : undefined,
      { requireContact: modalMode === 'create' },
    )
    if (modalMode === 'create') {
      if (!password.trim()) {
        next.push('Mật khẩu không được để trống.')
      } else {
        const passwordError = validatePassword(password)
        if (passwordError) next.push(passwordError)
      }
    }
    if (next.length > 0) {
      setErrors(next)
      return
    }

    setErrors([])

    if (modalMode === 'create') {
      setAccountPreview({ draft: normalizedDraft, password })
      setModalMode(null)
      return
    }

    setIsSaving(true)

    try {
      if (modalMode === 'edit' && selectedId) {
        const updated = await adminApi.updateAccount(selectedId, {
          fullName: normalizedDraft.fullName,
          contact: normalizedDraft.contact || null,
          ...(normalizedDraft.role === 'TEACHER'
            ? {
                qualification: normalizedDraft.qualification.trim(),
                specializedSubjectId: normalizedDraft.specializedSubjectId,
              }
            : {}),
        })
        setAccountList((current) => current.map((item) => item.id === updated.id ? updated : item))
        setModalMode(null)
        setMessage(`Đã cập nhật thông tin tài khoản “${updated.fullName}” thành công.`)
      }
    } catch (error) {
      setErrors([error instanceof ApiError ? error.message : 'Không thể lưu tài khoản. Hãy thử lại.'])
    } finally {
      setIsSaving(false)
    }
  }

  async function confirmCreateAccount() {
    if (!accountPreview) return

    setIsSaving(true)
    try {
      const { draft: nextDraft, password: nextPassword } = accountPreview
      const created = await adminApi.createAccount({
        role: nextDraft.role,
         username: nextDraft.username,
         fullName: nextDraft.fullName,
         contact: nextDraft.contact || null,
        password: nextPassword,
        ...(nextDraft.role === 'TEACHER'
          ? {
              qualification: nextDraft.qualification.trim(),
              specializedSubjectId: nextDraft.specializedSubjectId,
            }
          : {}),
      })
      setAccountList((current) => [created, ...current])
      setSelectedId(created.id)
      setAccountPreview(null)
      setMessage(`Đã tạo tài khoản “${created.fullName}” (@${created.username}) thành công.`)
    } catch (error) {
      setAccountPreview(null)
      setModalMode('create')
      setErrors([error instanceof ApiError ? error.message : 'Không thể lưu tài khoản. Hãy thử lại.'])
    } finally {
      setIsSaving(false)
    }
  }

  async function handleResetPassword(passwordValue: string) {
    if (!passwordResetAccount) return

    setIsResettingPassword(true)
    try {
      await adminApi.resetAccountPassword(passwordResetAccount.id, passwordValue)
      setMessage(`Đã đặt lại mật khẩu cho tài khoản “${passwordResetAccount.fullName}”.`)
      setPasswordResetAccount(null)
    } finally {
      setIsResettingPassword(false)
    }
  }

  return (
    <div className="page-content adm-page">
      <div className="page-heading">
        <h1>Tài khoản</h1>
        <p>Quản lý giáo viên, học sinh và trạng thái truy cập.</p>
      </div>

      {isLoading && <div className="adm-notice" role="status">Đang tải danh sách tài khoản...</div>}
      {loadError && <div className="adm-errors" role="alert"><strong>Không thể tải tài khoản:</strong> {loadError}</div>}

      {message && (
        <div className="adm-feedback is-success" role="status"><span>{message}</span></div>
      )}

      <div className="adm-toolbar">
        <div className="adm-toolbar-title"><strong>Danh sách tài khoản</strong><span>{visible.length}</span></div>
        <button type="button" className="adm-primary" onClick={startCreate}>
          <Plus size={17} /> Tạo tài khoản
        </button>
      </div>

      <div className="adm-layout">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Giáo viên & học sinh</h2>
          </div>

          <AccountFilters
            search={search}
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            onSearchChange={setSearch}
            onRoleChange={setRoleFilter}
            onStatusChange={setStatusFilter}
          />

          <AccountsTable
            accounts={visible}
            selectedId={selected?.id ?? null}
            isLoading={isLoading}
            onSelect={(accountId) => { setSelectedId(accountId); setMessage('') }}
          />
        </section>

        <aside className="adm-card adm-detail">
          {selected ? (
            <>
              <div className="adm-card-head">
                <h2>{selected.fullName}</h2>
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
                    <div><dt>Môn chuyên môn</dt><dd>{selected.specializedSubjectName ?? 'Chưa cập nhật'}</dd></div>
                  </>
                ) : (
                  <div><dt>Lớp hiện tại</dt><dd>{selected.classroomName ?? <span className="adm-unassigned">Chưa có lớp</span>}</dd></div>
                )}
              </dl>
              <div className="adm-actions">
                <button type="button" className="adm-secondary" onClick={() => startEdit(selected)}>
                  Chỉnh sửa tài khoản
                </button>
                <button type="button" className="adm-text-button" onClick={async () => {
                  try {
                    const updated = await adminApi.updateAccountStatus(selected.id, selected.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
                    setAccountList((current) => current.map((item) => item.id === updated.id ? updated : item))
                    setMessage(`Đã ${updated.status === 'ACTIVE' ? 'kích hoạt' : 'ngừng hoạt động'} tài khoản “${updated.fullName}”.`)
                  } catch (error) {
                    setMessage(error instanceof ApiError ? error.message : 'Không thể cập nhật trạng thái tài khoản.')
                  }
                }}>
                  {selected.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
                </button>
                <button type="button" className="adm-text-button" onClick={() => setPasswordResetAccount(selected)}>
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

      {modalMode && (
        <AccountFormDialog
          mode={modalMode}
          accountName={selected?.fullName ?? ''}
          draft={draft}
          password={password}
          subjects={subjectList}
          errors={errors}
          isSaving={isSaving}
          onClose={closeModal}
          onSubmit={handleSubmitAccount}
          onDraftChange={setDraft}
          onPasswordChange={setPassword}
          onClearErrors={() => setErrors([])}
        />
      )}

      {accountPreview && (
        <AccountPreviewDialog
          draft={accountPreview.draft}
          password={accountPreview.password}
          subjectName={subjectList.find((subject) => subject.id === accountPreview.draft.specializedSubjectId)?.name}
          isSaving={isSaving}
          onBack={() => { setAccountPreview(null); setModalMode('create') }}
          onConfirm={confirmCreateAccount}
        />
      )}

      {passwordResetAccount && (
        <PasswordResetDialog
          account={passwordResetAccount}
          isSaving={isResettingPassword}
          onClose={() => setPasswordResetAccount(null)}
          onSave={handleResetPassword}
        />
      )}
    </div>
  )
}
