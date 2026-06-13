import { NotebookTabs, type NotebookTabKey } from './NotebookTabs.js'

interface AboutPageProps {
  onNavigate?: (tab: NotebookTabKey) => void
}

const abaCodeLegend = [
  { code: 1, label: 'Seen everywhere', body: 'Common birds that are routine across the ABA area.' },
  { code: 2, label: 'Regionally common', body: 'Still familiar, but not as universal as code 1 birds.' },
  { code: 3, label: 'Locally uncommon', body: 'Worth tracking when you want a cleaner signal for rarity.' },
  { code: 4, label: 'Scarce', body: 'A more notable sighting, usually worth a second look.' },
  { code: 5, label: 'Rare', body: 'The main focus of this dashboard and the default feed.' },
  { code: 6, label: 'Very rare', body: 'The birds that tend to make the whole board light up.' },
]

const AboutPage = ({ onNavigate = () => {} }: AboutPageProps) => {
  return (
    <main className="about-page">
      <NotebookTabs activeTab="about" onNavigate={onNavigate} />

      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="about-kicker">Field guide</p>
          <h1>About ABA codes</h1>
          <p className="about-intro">
            This dashboard uses ABA rarity codes to sort sightings by how uncommon they are.
            The home page focuses on the rarer end of the spectrum so the most noteworthy birds stay front and center.
          </p>
        </div>
      </section>

      <section className="about-grid" aria-label="ABA code overview">
        <article className="about-card about-card-wide">
          <h2>What the codes mean</h2>
          <p>
            ABA codes are a quick rarity shorthand. Lower numbers mean the bird is more familiar;
            higher numbers mean it is harder to find. In this app, codes 3 through 6 are the main signal.
          </p>
        </article>

        <article className="about-card">
          <h2>How the home page uses them</h2>
          <p>
            The dashboard defaults to codes 3, 4, 5, and 6 so the feed stays focused on unusual sightings.
            You can still narrow that list further with the rarity filters.
          </p>
        </article>

        <article className="about-card">
          <h2>Why it matters</h2>
          <p>
            A code gives you a fast read on whether a sighting is routine, notable, or the kind of bird
            people talk about afterward.
          </p>
        </article>
      </section>

      <section className="about-legend">
        <h2>Code legend</h2>
        <div className="legend-list">
          {abaCodeLegend.map((entry) => (
            <article className="legend-item" key={entry.code}>
              <div className="legend-code">{entry.code}</div>
              <div className="legend-copy">
                <h3>{entry.label}</h3>
                <p>{entry.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export { AboutPage }
