type NotebookTabKey = 'dashboard' | 'about'

interface NotebookTabsProps {
  activeTab: NotebookTabKey
  onNavigate: (tab: NotebookTabKey) => void
}

const notebookTabs = [
  { key: 'dashboard' as const, label: 'Dashboard', href: '/' },
  { key: 'about' as const, label: 'About', href: '/about' },
]

const NotebookTabs = ({ activeTab, onNavigate }: NotebookTabsProps) => {
  return (
    <nav className="notebook-tabs" aria-label="Site sections">
      {notebookTabs.map((tab) => {
        const isActive = tab.key === activeTab

        return (
          <a
            key={tab.key}
            className={`notebook-tab ${isActive ? 'active' : ''}`}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              onNavigate(tab.key)
            }}
            >
            <span className="ui-control-label">{tab.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

export { NotebookTabs }
export type { NotebookTabKey }
