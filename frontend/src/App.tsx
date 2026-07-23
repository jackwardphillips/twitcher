import { useEffect, useState } from 'react'
import { Dashboard } from './components/Dashboard.js'
import { AboutPage } from './components/AboutPage.js'
import { StatisticsPage } from './components/StatisticsPage.js'
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

  const handleNavigate = (tab: 'dashboard' | 'statistics' | 'about') => {
    if (tab === 'about') {
      navigate('/about')
      return
    }

    if (tab === 'statistics') {
      navigate('/statistics')
      return
    }

    navigate('/')
  }

  return (
      <div className="app-container">
      {pathname === '/statistics' ? (
        <StatisticsPage onNavigate={handleNavigate} />
      ) : pathname === '/about' ? (
        <AboutPage onNavigate={handleNavigate} />
      ) : (
        <Dashboard onNavigate={handleNavigate} />
      )}
    </div>
  )
}

export { App }
