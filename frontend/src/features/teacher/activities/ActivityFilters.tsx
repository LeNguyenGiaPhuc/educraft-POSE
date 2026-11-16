export type ActivityFilterValues = {
  type: string
  status: string
  from: string
  to: string
}

type Props = {
  values: ActivityFilterValues
  onChange: (key: keyof ActivityFilterValues, value: string) => void
}

export function ActivityFilters({ values, onChange }: Props) {
  return (
    <div className="ta-history-filters">
      <label>
        Loại hoạt động
        <select value={values.type} onChange={(event) => onChange('type', event.target.value)}>
          <option value="">Tất cả các loại</option>
          <option value="QUIZ">Quiz</option>
          <option value="WRITTEN">Tự luận</option>
          <option value="NOTEBOOK">Kiểm tra vở</option>
        </select>
      </label>

      <label>
        Trạng thái
        <select value={values.status} onChange={(event) => onChange('status', event.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="PUBLISHED">Đang mở nhận bài</option>
          <option value="CLOSED">Đã đóng nhận bài</option>
        </select>
      </label>

      <label>
        Đóng từ ngày
        <input type="date" value={values.from} onChange={(event) => onChange('from', event.target.value)} />
      </label>

      <label>
        Đến ngày
        <input type="date" value={values.to} onChange={(event) => onChange('to', event.target.value)} />
      </label>
    </div>
  )
}
