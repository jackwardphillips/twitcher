import { useEffect, useState, type CSSProperties } from 'react'
import { getRarityColor } from '../lib/rarity-utils.js'
import { JournalHeader } from './JournalHeader.js'
import { NotebookTabs, type NotebookTabKey } from './NotebookTabs.js'

const API_URL = import.meta.env.VITE_API_URL ?? ''
const rarityCodes = [3, 4, 5, 6] as const

type RarityCode = typeof rarityCodes[number]
type RankingMode = 'county' | 'state'

interface StateRarityStat {
  region: string
  total: number
  counts: Record<RarityCode, number>
  birds?: RarityRegionBird[]
}

interface RarityRegionBird {
  id: string
  commonName: string
  rarity: RarityCode
  status: string
  activeDays: number
  sightingCount: number
  firstSeen: string
  lastSeen: string
}

interface RarityStatsOptions {
  states: string[]
  years: number[]
}

interface StatisticsPageProps {
  onNavigate?: (tab: NotebookTabKey) => void
}

const StatisticsPage = ({ onNavigate = () => {} }: StatisticsPageProps) => {
  const [rankingMode, setRankingMode] = useState<RankingMode>('state')
  const [selectedState, setSelectedState] = useState('')
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [options, setOptions] = useState<RarityStatsOptions>({ states: [], years: [] })
  const [stateStats, setStateStats] = useState<StateRarityStat[]>([])
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/statistics/state-rarities/options`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch statistic filters')
        return res.json()
      })
      .then((data: RarityStatsOptions) => {
        setOptions(data)
      })
      .catch(() => {
        setOptions({ states: [], years: [] })
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ groupBy: rankingMode })
    if (selectedState) params.set('state', selectedState)
    if (selectedYear) params.set('year', selectedYear)

    fetch(`${API_URL}/api/statistics/state-rarities?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch statistics')
        return res.json()
      })
      .then((data: StateRarityStat[]) => {
        setStateStats(data)
        setExpandedRegion(null)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [rankingMode, selectedState, selectedYear])

  const maxTotal = Math.max(...stateStats.map((stat) => stat.total), 0)
  const title = rankingMode === 'county' ? 'Counties with the Most Rarities' : 'States with the Most Rarities'

  return (
    <main className="statistics-page" data-theme="ranger-station">
      <div className="notebook-top-shell">
        <NotebookTabs activeTab="statistics" onNavigate={onNavigate} />

        <JournalHeader
          controls={
            <div className="statistics-filters statistics-header-filters">
              <label>
                <span>State/Province</span>
                <select value={selectedState} onChange={(event) => setSelectedState(event.target.value)}>
                  <option value="">All</option>
                  {options.states.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Year</span>
                <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
                  <option value="">All</option>
                  <option value="active">Active</option>
                  {options.years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
            </div>
          }
        />
      </div>

      <section className="statistics-shell" aria-label="Statistics">
        <article className="statistics-card" aria-labelledby="state-rarities-heading">
          <div className="statistics-card-header">
            <div>
              <h2 id="state-rarities-heading">{title}</h2>
            </div>
            <div className="statistics-toggle" aria-label="Ranking scope">
              <button
                className={rankingMode === 'state' ? 'active' : ''}
                type="button"
                aria-pressed={rankingMode === 'state'}
                onClick={() => setRankingMode('state')}
              >
                State
              </button>
              <button
                className={rankingMode === 'county' ? 'active' : ''}
                type="button"
                aria-pressed={rankingMode === 'county'}
                onClick={() => setRankingMode('county')}
              >
                County
              </button>
            </div>
          </div>

          {loading ? (
            <div className="statistics-state">Loading statistics...</div>
          ) : error ? (
            <div className="statistics-state">Error: {error}</div>
          ) : stateStats.length === 0 ? (
            <div className="statistics-state">No code 3-6 rarities found.</div>
          ) : (
            <div className="state-rarity-chart">
              {stateStats.map((stat) => (
                <div key={stat.region} className="state-rarity-row">
                  <button
                    className="state-rarity-label"
                    type="button"
                    aria-expanded={expandedRegion === stat.region}
                    onClick={() => setExpandedRegion((current) => current === stat.region ? null : stat.region)}
                  >
                    <span className="state-rarity-region">{stat.region}</span>
                  </button>
                  <div className="state-rarity-bar-wrap">
                    <span className="state-rarity-total">{stat.total}</span>
                    <div className="state-rarity-bar" aria-label={`${stat.region}: ${stat.total} total rarities`}>
                      <span
                        className="state-rarity-fill"
                        style={{ width: `${maxTotal > 0 ? (stat.total / maxTotal) * 100 : 0}%` }}
                      >
                        {rarityCodes.map((code) => {
                          const count = stat.counts[code]
                          if (count === 0) return null

                          return (
                            <span
                              key={code}
                              className="state-rarity-segment"
                              title={`Code ${code}: ${count}`}
                              style={{
                                '--rarity-color': getRarityColor(code),
                                width: `${(count / stat.total) * 100}%`,
                              } as CSSProperties}
                            />
                          )
                        })}
                      </span>
                    </div>
                  </div>
                  {expandedRegion === stat.region && stat.birds && (
                    <div className="state-rarity-birds">
                      <div className="state-rarity-bird state-rarity-bird-header">
                        <span />
                        <span>Bird</span>
                        <span>Sightings</span>
                        <span>First</span>
                        <span>Last</span>
                      </div>
                      {stat.birds.map((bird) => (
                        <div key={bird.id} className="state-rarity-bird">
                          <span
                            className="state-rarity-bird-code"
                            style={{ '--rarity-color': getRarityColor(bird.rarity) } as CSSProperties}
                          >
                            {bird.rarity}
                          </span>
                          <span className="state-rarity-bird-name">{bird.commonName}</span>
                          <span className="state-rarity-bird-meta">{bird.sightingCount ?? 0}</span>
                          <span className="state-rarity-bird-meta">{bird.firstSeen || 'Unknown'}</span>
                          {bird.status === 'OPEN' ? (
                            <span className="streak-badge state-rarity-active-pill">
                              Active
                            </span>
                          ) : (
                            <span className="state-rarity-bird-meta">{bird.lastSeen || 'Unknown'}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  )
}

export { StatisticsPage }
