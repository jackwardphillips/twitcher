import type { ReactNode } from 'react'

interface JournalHeaderProps {
  controls: ReactNode
}

const JournalHeader = ({ controls }: JournalHeaderProps) => {
  return (
    <header className="dashboard-header">
      <div className="header-main">
        <h1>twitcher</h1>
        <div className="header-subtitle">Field notes &amp; ABA rarities</div>
      </div>
      <div className="controls">
        {controls}
      </div>
    </header>
  )
}

export { JournalHeader }
