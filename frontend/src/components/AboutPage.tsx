import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { getRarityColor, RARITY_COLOR_MAP } from '../lib/rarity-utils.js'
import { NotebookTabs, type NotebookTabKey } from './NotebookTabs.js'
import { JournalHeader } from './JournalHeader.js'
import { RarityFilter, type RarityCode } from './RarityFilter.js'
import { PhotoSlot } from './PhotoSlot.js'
import { SightingHistogram } from './SightingHistogram.js'
import { formatDayMonth } from '../lib/date-utils.js'

const buildDailyCounts = (startDate: string, counts: number[]) => {
  const start = new Date(`${startDate}T00:00:00`)

  return counts.map((count, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)

    return {
      date: date.toISOString().slice(0, 10),
      count,
    }
  })
}

const aboutCardExamples: Record<RarityCode, {
  commonName: string
  scientificName: string
  locationName: string
  description: string
  firstSeen: string
  lastSeen: string
  sightingCount: number
  activeDays: number
  dailyCounts: { date: string; count: number }[]
  photo: { url: string; attribution: string } | null
  photoStyle?: CSSProperties
}> = {
  1: {
    commonName: 'American Robin',
    scientificName: 'Turdus migratorius',
    locationName: 'Williamsburg, Virginia',
    description: 'The park is lousy with them!',
    firstSeen: '2026-05-01',
    lastSeen: '2026-05-25',
    sightingCount: 308,
    activeDays: 25,
    dailyCounts: buildDailyCounts('2026-05-01', [8, 10, 11, 9, 12, 14, 13, 15, 12, 11, 14, 13, 12, 10, 15, 16, 14, 12, 10, 13, 11, 12, 13, 14, 14]),
    photo: {
      url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/34859026/medium.jpg',
      attribution: '(c) John D Reynolds, some rights reserved (CC BY-NC), uploaded by John D Reynolds',
    },
  },
  2: {
    commonName: 'Cerulean Warbler',
    scientificName: 'Setophaga cerulea',
    locationName: 'Rockland, New York',
    description: 'On the road to Doodletown, seen with Golden-winged warblers.',
    firstSeen: '2026-05-03',
    lastSeen: '2026-05-25',
    sightingCount: 46,
    activeDays: 20,
    dailyCounts: buildDailyCounts('2026-05-01', [0, 0, 2, 1, 3, 2, 4, 0, 3, 1, 2, 4, 3, 0, 2, 1, 4, 2, 3, 1, 0, 2, 3, 2, 1]),
    photo: {
      url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/196225341/medium.jpeg',
      attribution: '(c) Matt Schenck, some rights reserved (CC BY), uploaded by Matt Schenck',
    },
    photoStyle: {
      objectPosition: '32% center',
    },
  },
  3: {
    commonName: 'Sharp-tailed Sandpiper',
    scientificName: 'Calidris acuminata',
    locationName: 'Marquette, Michigan',
    description: 'Seen in the marsh overlook with a slight limp.',
    firstSeen: '2026-05-01',
    lastSeen: '2026-05-25',
    sightingCount: 63,
    activeDays: 23,
    dailyCounts: buildDailyCounts('2026-05-01', [1, 2, 0, 3, 2, 4, 1, 0, 2, 3, 4, 2, 1, 5, 4, 6, 3, 2, 5, 4, 2, 1, 3, 2, 1]),
    photo: {
      url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/447383422/medium.jpg',
      attribution: '(c) Samuel Amaris, some rights reserved (CC BY-NC), uploaded by Samuel Amaris',
    },
    photoStyle: {
      objectPosition: '15% center',
    },
  },
  4: {
    commonName: 'Bananaquit',
    scientificName: 'Coereba flaveola',
    locationName: 'Barnstable, Massachusetts',
    description: 'Came to my feeder in my backyard!',
    firstSeen: '2026-05-04',
    lastSeen: '2026-05-24',
    sightingCount: 17,
    activeDays: 14,
    dailyCounts: buildDailyCounts('2026-05-01', [0, 0, 0, 1, 0, 2, 1, 0, 1, 2, 0, 1, 1, 2, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0]),
    photo: {
      url: 'https://static.inaturalist.org/photos/207544720/medium.jpg',
      attribution: '(c) Mason Maron, all rights reserved, uploaded by Mason Maron',
    },
    photoStyle: {
      objectPosition: '70% center',
    },
  },
  5: {
    commonName: 'Yellow-headed Caracara',
    scientificName: 'Daptrius chimachima',
    locationName: 'Wilmington, Delaware',
    description: 'Seen near the meat-packing plant. He must smell food.',
    firstSeen: '2026-05-11',
    lastSeen: '2026-05-25',
    sightingCount: 9,
    activeDays: 9,
    dailyCounts: buildDailyCounts('2026-05-01', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1]),
    photo: {
      url: 'https://static.inaturalist.org/photos/79568634/medium.jpeg',
      attribution: '(c) Larry Zheng, all rights reserved, uploaded by Larry Zheng',
    },
    photoStyle: {
      objectPosition: '41% center',
    },
  },
  6: {
    commonName: 'Ivory-billed Woodpecker',
    scientificName: 'Campephilus principalis',
    locationName: 'Point Coupee, Louisiana',
    description: 'I swear I saw it!',
    firstSeen: '1944-04-20',
    lastSeen: '1944-04-20',
    sightingCount: 1,
    activeDays: 1,
    dailyCounts: buildDailyCounts('1944-03-27', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
    photo: {
      url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/430795661/medium.jpeg',
      attribution: '(c) Jeff Steele, some rights reserved (CC BY-NC), uploaded by Jeff Steele',
    },
    photoStyle: {
      objectPosition: 'center top',
      transform: 'translateY(-14%) scale(1.22)',
      transformOrigin: 'center top',
    },
  },
}

interface AboutTooltipProps {
  children: ReactNode
  className?: string
  tooltip: string
}

const AboutTooltip = ({ children, className = '', tooltip }: AboutTooltipProps) => {
  const classes = ['about-tooltip-target', className].filter(Boolean).join(' ')
  const targetRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const pointerRef = useRef<{ x: number; y: number } | null>(null)

  const updatePosition = () => {
    const target = targetRef.current
    const tip = tooltipRef.current
    if (!target || !tip) return

    const tipRect = tip.getBoundingClientRect()
    const viewportPadding = 12
    const pointer = pointerRef.current

    let left = pointer ? pointer.x + 14 : target.getBoundingClientRect().left
    if (left + tipRect.width > window.innerWidth - viewportPadding) {
      left = window.innerWidth - tipRect.width - viewportPadding
    }
    if (left < viewportPadding) {
      left = viewportPadding
    }

    let top = pointer ? pointer.y + 18 : target.getBoundingClientRect().bottom + 10
    if (top + tipRect.height > window.innerHeight - viewportPadding) {
      top = window.innerHeight - tipRect.height - viewportPadding
    }
    if (top < viewportPadding) {
      top = viewportPadding
    }

    setPosition({ top, left })
  }

  useLayoutEffect(() => {
    if (!isOpen) return
    // DOM geometry is only available after the tooltip has rendered.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updatePosition()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleUpdate = () => updatePosition()
    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true)

    return () => {
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true)
    }
  }, [isOpen])

  return (
    <>
      <div
        ref={targetRef}
        className={classes}
        tabIndex={0}
        onMouseEnter={(event) => {
          pointerRef.current = { x: event.clientX, y: event.clientY }
          setIsOpen(true)
        }}
        onMouseMove={(event) => {
          pointerRef.current = { x: event.clientX, y: event.clientY }
          if (isOpen) updatePosition()
        }}
        onMouseLeave={() => {
          pointerRef.current = null
          setIsOpen(false)
        }}
        onFocus={() => {
          pointerRef.current = null
          setIsOpen(true)
        }}
        onBlur={() => {
          pointerRef.current = null
          setIsOpen(false)
        }}
      >
        {children}
      </div>
      {isOpen && createPortal(
        <div
          ref={tooltipRef}
          className="about-tooltip-portal"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          {tooltip}
        </div>,
        document.body,
      )}
    </>
  )
}

interface AboutPageProps {
  onNavigate?: (tab: NotebookTabKey) => void
}

const AboutPage = ({ onNavigate = () => {} }: AboutPageProps) => {
  const [aboutCardRarity, setAboutCardRarity] = useState<RarityCode>(5)
  const rarityColor = getRarityColor(aboutCardRarity)
  const selectedExample = aboutCardExamples[aboutCardRarity]

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

        <article className="about-card">
          <h2 className="about-card-title">About the Project</h2>
          <section className="about-card-section">
            <p>
              Twitcher arose from me obsessively checking my email every day for eBird's ABA Rare Bird Alert, pouring through a list to see if anything was within a day's drive for me to go see. When a bird would pop up, I'd be checking eBird, Discord, GroupMe, even Facebook sometimes to try and get all the information I could, not to mention wanting to learn about the bird itself. I wanted a place where I could access all this information readily, and from that Twitcher was born.
            </p>
          </section>

          <section className="about-card-section">
            <h3>About the Cards</h3>
            <p className="about-section-lead">
              One card will display information for one "incident," which is a cluster of sightings. There's some math to determine how far apart sightings can be to be considered one incident, but more importantly incidents can be open, closed, or permanently closed. Open incidents are obviously open and have new sightings coming in frequently. Closed incidents haven't received sightings in over 3 days, but there is still a window for them to re-open should the bird be found again. Permanently closed incidents are, as the name suggests, permanently closed. A sighting of the bird will open a new incident.
            </p>
            <p className="about-section-lead">
              The cards are meant to offer a quick glance into the bird being seen. Hover over the different elements in the card to explore what they are, and use the ABA code buttons to see different examples.
            </p>
            <div className="about-demo-controls">
              <RarityFilter
                selectedRarities={[aboutCardRarity]}
                onToggleRarity={setAboutCardRarity}
              />
            </div>

            <div className="about-demo-list">
              <div
                className="sighting-card sighting-card-horizontal about-demo-card"
                style={{
                  borderLeftColor: rarityColor,
                  '--rarity-color': rarityColor,
                } as CSSProperties}
              >
                <AboutTooltip className="about-demo-photo" tooltip="An image of the bird, sourced from iNaturalist.">
                  <PhotoSlot photo={selectedExample.photo} imgStyle={selectedExample.photoStyle} />
                </AboutTooltip>

                <div className="card-content">
                  <div className="card-top-row">
                    <div className="species-info">
                      <AboutTooltip tooltip="The common name of the bird.">
                        <h3>{selectedExample.commonName}</h3>
                      </AboutTooltip>
                      <AboutTooltip tooltip="The scientific name of the bird.">
                        <p className="scientific-name">{selectedExample.scientificName}</p>
                      </AboutTooltip>
                      <AboutTooltip tooltip="The location of the bird.">
                        <div className="location-container">
                          <svg className="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          <p className="location-info">{selectedExample.locationName}</p>
                        </div>
                      </AboutTooltip>
                    </div>

                  </div>

                  <AboutTooltip tooltip="An AI-generated summary of location and behavior from eBird comments.">
                    <blockquote
                      className="gemini-summary"
                      style={{ borderLeftColor: rarityColor }}
                    >
                      {selectedExample.description}
                    </blockquote>
                  </AboutTooltip>

                  <div className="card-middle-row">
                    <AboutTooltip className="stat-item" tooltip="How many times the bird has been reported on eBird.">
                      <span className="stat-label">Reports</span>
                      <span className="stat-value">{selectedExample.sightingCount}</span>
                    </AboutTooltip>
                    <AboutTooltip className="stat-item" tooltip="When the bird was first reported.">
                      <span className="stat-label">First Seen</span>
                      <span className="stat-value">{formatDayMonth(selectedExample.firstSeen)}</span>
                    </AboutTooltip>
                    <AboutTooltip className="stat-item" tooltip="When the bird was last reported.">
                      <span className="stat-label">Last Seen</span>
                      <span className="stat-value">{formatDayMonth(selectedExample.lastSeen)}</span>
                    </AboutTooltip>
                    <AboutTooltip className="stat-item about-demo-histogram" tooltip="A histogram showing how often the bird has been reported over the past 25 days.">
                      <SightingHistogram
                        dailyCounts={selectedExample.dailyCounts}
                        rarityColor={rarityColor}
                      />
                    </AboutTooltip>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </article>
      </section>
    </main>
  )
}

export { AboutPage }
