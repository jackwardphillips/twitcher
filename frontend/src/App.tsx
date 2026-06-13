import { useEffect, useState } from 'react'
import { Dashboard } from './components/Dashboard.js'
import { AboutPage } from './components/AboutPage.js'
import './App.css'
import './styles/themes.css'

const getPathname = () => window.location.pathname

function App() {
  const [pathname, setPathname] = useState(getPathname)

  useEffect(() => {
    const handlePopState = () => {
      setPathname(getPathname())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (path: string) => {
    if (path === pathname) return
    window.history.pushState({}, '', path)
    setPathname(path)
  }

  return (
      <div className="app-container">
      {pathname === '/about' ? (
        <AboutPage onNavigate={(tab) => navigate(tab === 'about' ? '/about' : '/')} />
      ) : (
        <Dashboard onNavigate={(tab) => navigate(tab === 'about' ? '/about' : '/')} />
      )}
    </div>
  )
}

export { App }
