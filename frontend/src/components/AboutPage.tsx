import { RARITY_COLOR_MAP } from '../lib/rarity-utils.js'
import { NotebookTabs, type NotebookTabKey } from './NotebookTabs.js'
import { JournalHeader } from './JournalHeader.js'

interface AboutPageProps {
  onNavigate?: (tab: NotebookTabKey) => void
}

const AboutPage = ({ onNavigate = () => {} }: AboutPageProps) => {
  return (
    <main className="about-page" data-theme="ranger-station">
      <div className="notebook-top-shell">
        <NotebookTabs activeTab="about" onNavigate={onNavigate} />

        <JournalHeader controls={null} />
      </div>

      <section className="about-stack" aria-label="About the ABA">
        <article className="about-card">
          <h2 className="about-card-title">About the ABA</h2>
          <section className="about-card-section">
            <h3>What is the ABA?</h3>
            <p>
              The American Birding Association (ABA) is a non-profit 501(c)(3) organization that provides leadership to birders by increasing their knowledge, skills, and enjoyment of birding. <span className="about-source-inline"><em>Source: <a href="https://www.aba.org/american-birding-association/?_gl=1*piiqcs*_ga*ODgyOTA2MjIzLjE3ODEzMDU4MjU.*_ga_MY35D7ZG1T*czE3ODEzNjcwMDUkbzIkZzEkdDE3ODEzNjcyNTUkajYwJGwwJGg1MTYyMDQ2MDI." target="_blank" rel="noreferrer">ABA.org</a></em></span>
            </p>
          </section>

          <section className="about-card-section">
            <h3>What is the ABA area?</h3>
            <p>
              The ABA Area includes the 49 continental United States, Hawaii, Canada, the French islands of St. Pierre and Miquelon, and adjacent waters to a distance of 200 miles from land or half the distance to a neighboring country, whichever is less. Bermuda and Greenland are not included. <span className="about-source-inline"><em>Source: <a href="https://www.aba.org/listing-areas-and-regions/" target="_blank" rel="noreferrer">ABA.org</a></em></span>
            </p>
          </section>

          <section className="about-card-section">
            <h3>What are ABA rarity codes?</h3>
            <p className="about-section-lead">
              ABA rarity codes describe how often species occur in the ABA Area. <span className="about-source-inline"><em>Source: <a href="https://www.aba.org/aba-checklist/" target="_blank" rel="noreferrer">ABA.org</a></em></span>
            </p>
            <p className="about-rarity-paragraph">
              Codes <span className="about-code-pill" style={{ '--rarity-color': RARITY_COLOR_MAP[1] } as React.CSSProperties}>1</span> and <span className="about-code-pill" style={{ '--rarity-color': RARITY_COLOR_MAP[2] } as React.CSSProperties}>2</span> are regularly occurring ABA Area avifauna, including regular breeding species and visitors. There is no firm line between them, except that Code 1 species are generally more widespread and more numerous. Code 2 species may have a restricted range, occur at lower densities, or be secretive enough to be difficult to detect. Code <span className="about-code-pill" style={{ '--rarity-color': RARITY_COLOR_MAP[3] } as React.CSSProperties}>3</span> species occur in very low numbers, but annually, in the ABA Area. This includes visitors and rare breeding residents. Code <span className="about-code-pill" style={{ '--rarity-color': RARITY_COLOR_MAP[4] } as React.CSSProperties}>4</span> species are not recorded annually in the ABA Area, but with six or more total records, including three or more in the past 30 years. Code <span className="about-code-pill" style={{ '--rarity-color': RARITY_COLOR_MAP[5] } as React.CSSProperties}>5</span> species have been recorded five or fewer times in the ABA Area, or fewer than three records in the past 30 years. Code <span className="about-code-pill" style={{ '--rarity-color': RARITY_COLOR_MAP[6] } as React.CSSProperties}>6</span> species are probably or actually extinct from the ABA Area, all survivors are held in captivity, or releases are not yet naturally re-established.
            </p>
          </section>
        </article>
      </section>
    </main>
  )
}

export { AboutPage }
