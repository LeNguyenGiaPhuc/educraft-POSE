import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

type Tab = { id: string; label: string; content: ReactNode }
type Props = { tabs: Tab[]; label?: string }

export function NotebookTabs({ tabs, label = 'Nội dung' }: Props) {
  const [selected, setSelected] = useState(tabs[0]?.id)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const active = tabs.find((tab) => tab.id === selected) ?? tabs[0]

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else return
    event.preventDefault()
    setSelected(tabs[next].id)
    refs.current[next]?.focus()
  }

  if (!active) return null
  return <div className="ec-notebook">
    <div className="ec-notebook-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => <button key={tab.id} ref={(node) => { refs.current[index] = node }} type="button" role="tab" id={`ec-tab-${tab.id}`} aria-controls={`ec-panel-${tab.id}`} aria-selected={active.id === tab.id} tabIndex={active.id === tab.id ? 0 : -1} onKeyDown={(event) => handleKeyDown(event, index)} onClick={() => setSelected(tab.id)}>{tab.label}</button>)}
    </div>
    <div className="ec-notebook-panel" role="tabpanel" id={`ec-panel-${active.id}`} aria-labelledby={`ec-tab-${active.id}`} tabIndex={0}>{active.content}</div>
  </div>
}
