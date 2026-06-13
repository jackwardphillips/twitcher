type NotebookTabKey = 'dashboard' | 'about'

interface NotebookTabsProps {
  activeTab: NotebookTabKey
  onNavigate: (tab: NotebookTabKey) => void
}

const notebookTabs = [
  { key: 'dashboard' as const, label: 'Dashboard' },
  { key: 'about' as const, label: 'ABA Codes' },
]

const NotebookTabs = ({ activeTab, onNavigate }: NotebookTabsProps) => {
  return (
    <nav className="notebook-tabs" aria-label="Site sections">
      {notebookTabs.map((tab) => {
        const isActive = tab.key === activeTab

        return (
          <button
            key={tab.key}
            type="button"
            className={`notebook-tab ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onNavigate(tab.key)}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}

export { NotebookTabs }
export type { NotebookTabKey }
