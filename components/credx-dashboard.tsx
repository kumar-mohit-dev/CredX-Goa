'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, Award, Bell, BriefcaseBusiness,
  CalendarDays, Check, CheckCheck, ChevronDown, CircleCheck,
  Clock3, CloudUpload, ExternalLink, FileBadge2, FileCheck2,
  FileText, GraduationCap, Info, Mail, MapPin, Medal, Menu,
  Plus, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sparkles, Trophy,
  Users, X, Zap, Send
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCredX, Student } from '@/components/use-credx'

type Page = 'leaderboard' | 'competitions' | 'faculty' | 'recruiter'
type Scope = 'state' | 'college'

const nav: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'competitions', label: 'Upcoming Competitions', icon: CalendarDays },
  { id: 'faculty', label: 'Faculty Portal', icon: GraduationCap },
  { id: 'recruiter', label: 'Recruiter View', icon: BriefcaseBusiness },
]

function Avatar({ student, size = 'normal' }: { student: Student; size?: 'normal' | 'large' }) {
  return <span className={`avatar avatar-${student.avatar || 'teal'} ${size === 'large' ? 'avatar-large' : ''}`} aria-label={student.name}>{student.initials}</span>
}

function IconButton({ icon: Icon, label, onClick, className = '' }: { icon: LucideIcon; label: string; onClick: () => void; className?: string }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} onClick={onClick}><Icon size={19} strokeWidth={1.8} /></button>
}

function Tag({ children, tone = 'neutral', icon: Icon }: { children: React.ReactNode; tone?: string; icon?: LucideIcon }) {
  return <span className={`tag tag-${tone}`}>{Icon && <Icon size={13} strokeWidth={2} />}{children}</span>
}

function Progress({ value, max, tone }: { value: number; max: number; tone: string }) {
  return <div className="progress-track"><div className={`progress-fill progress-${tone}`} style={{ width: `${Math.min(value / max * 100, 100)}%` }} /></div>
}

export default function CredXDashboard() {
  const [page, setPage] = useState<Page>('leaderboard')
  const [scope, setScope] = useState<Scope>('state')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Student | null>(null)
  
  // UI States
  const [uploadOpen, setUploadOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [collegeFilter, setCollegeFilter] = useState('All colleges')
  const [toast, setToast] = useState('')
  const [savedEvents, setSavedEvents] = useState<string[]>([])

  // Form States
  const [file, setFile] = useState<File | null>(null)
  const [certificateTitle, setCertificateTitle] = useState('')
  const [awardType, setAwardType] = useState('Winner')
  const [isUploading, setIsUploading] = useState(false)

  // Recruiter States
  const [inquiryTarget, setInquiryTarget] = useState<Student | null>(null)
  const [companyName, setCompanyName] = useState('TCS Research')
  const [recruiterEmail, setRecruiterEmail] = useState('talent@tcshub.com')
  const [inquiryMessage, setInquiryMessage] = useState('Requesting an official candidate profile.')
  const [isInquiring, setIsInquiring] = useState(false)

  // Backend Hook
  const { students, me, meStudent, viewProfile, competitions, pending, error, loading, refresh, upload, approve, reject, reset, inquire } = useCredX(page === 'recruiter' ? 'state' : scope, page === 'recruiter')

  const [today, setToday] = useState('')
  const [greeting, setGreeting] = useState('Hello')
  useEffect(() => {
    const d = new Date(), h = d.getHours()
    setToday(d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  const openProfile = (s: Student) => { setSelected(s); if (page === 'recruiter') viewProfile(s.id) }
  const timeAgo = (iso: string) => {
    const m = Math.max(Math.round((Date.now() - new Date(/Z|[+-]\d\d:\d\d$/.test(iso) ? iso : iso + 'Z').getTime()) / 60000), 0)
    return m < 1 ? 'Just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`
  }

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 4500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSelected(null); setUploadOpen(false); setNotificationsOpen(false); setFilterOpen(false); setInquiryTarget(null) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const filteredStudents = useMemo(() => students.filter((student: Student) => {
    const matchesCollege = collegeFilter === 'All colleges' || student.college === collegeFilter
    const matchesQuery = `${student.name} ${student.college} ${student.roll}`.toLowerCase().includes(query.toLowerCase())
    return matchesCollege && matchesQuery
  }), [students, query, collegeFilter])

  const changePage = (next: Page) => { setPage(next); setMobileNavOpen(false); setNotificationsOpen(false); setFilterOpen(false) }
  
  const handleReset = async () => {
    changePage('leaderboard')
    setScope('state')
    setQuery('')
    setSelected(null)
    setCollegeFilter('All colleges')
    await reset()
    setToast('Demo reset to its starting state')
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !certificateTitle.trim()) return
    try {
      setIsUploading(true)
      await upload(file, certificateTitle, awardType)
      setIsUploading(false)
      setUploadOpen(false)
      setFile(null)
      setCertificateTitle('')
      setToast('Certificate submitted! Faculty will review it shortly.')
      changePage('faculty')
    } catch (err: any) {
      setToast(`Upload failed: ${err.message}`)
      setIsUploading(false)
    }
  }

  const handleApprove = async (certId: string) => {
    try {
      const r = await approve(certId)
      setToast(`Approved +${r.points} pts · ${r.student.name} moved #${r.before.rank} → #${r.after.rank} (${r.before.score} → ${r.after.score})`)
      setScope('state')
      window.setTimeout(() => changePage('leaderboard'), 1400)
    } catch (err: any) {
      setToast(`Approval failed: ${err.message}`)
    }
  }

  const handleReject = async (certId: string) => {
    try { await reject(certId); setToast('Certificate rejected. No points awarded.') }
    catch (err: any) { setToast(`Action failed: ${err.message}`) }
  }

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inquiryTarget) return
    try {
      setIsInquiring(true)
      const res = await inquire(inquiryTarget.id, companyName, recruiterEmail, inquiryMessage)
      setIsInquiring(false)
      setInquiryTarget(null)
      setSelected(null)
      setToast(res.message)
    } catch (err: any) {
      setIsInquiring(false)
      setToast('Failed to route inquiry')
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <button className="brand" onClick={() => changePage('leaderboard')} aria-label="CredX Goa home">
            <span className="brand-mark"><Zap size={20} fill="currentColor" strokeWidth={1.9} /></span>
            <span className="brand-name">CredX <span>Goa</span></span>
            <span className="brand-beta">BETA</span>
          </button>
          
          <nav className={`main-nav ${mobileNavOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
            {nav.map(item => (
              <button key={item.id} className={`nav-link ${page === item.id ? 'active' : ''}`} onClick={() => changePage(item.id)}>
                <item.icon size={16} strokeWidth={1.9} />
                <span>{item.label}</span>
                {item.id === 'faculty' && pending.length > 0 && <span className="nav-dot" />}
              </button>
            ))}
          </nav>

          <div className="header-actions">
            <button className="reset-button" onClick={handleReset}><RotateCcw size={15} /> <span>Reset Demo</span></button>
            <div className="notification-wrap">
              <IconButton icon={Bell} label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)} className={notificationsOpen ? 'icon-button-active' : ''} />
              {me?.alerts?.length > 0 && <span className="notification-dot" />}
              {notificationsOpen && (
                <div className="notification-popover">
                  <div className="popover-heading"><strong>Notifications</strong><Tag tone="teal">{me?.alerts?.length || 0} new</Tag></div>
                  {me?.alerts?.map((alert: string, i: number) => (
                    <div key={i} className="notification-item">
                      <span className="notification-icon"><Sparkles size={17} /></span>
                      <div><strong>AI Strategic Insight</strong><p>{alert}</p><small>Just now</small></div>
                    </div>
                  ))}
                  <button className="popover-footer" onClick={() => { changePage('competitions'); setNotificationsOpen(false) }}>Explore competitions <ArrowRight size={15} /></button>
                </div>
              )}
            </div>
            {me && meStudent && (
              <button className="user-pill" onClick={() => setSelected(meStudent)}>
                <Avatar student={meStudent} />
                <span className="user-name">{me.name.split(' ')[0]}</span>
                <ChevronDown size={14} />
              </button>
            )}
            <IconButton icon={Menu} label="Toggle menu" onClick={() => setMobileNavOpen(!mobileNavOpen)} className="mobile-menu" />
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs font-bold text-center py-2 border-b border-red-100">
          Backend connection error: {error}. Make sure FastAPI is running.
        </div>
      )}

      <main className="main-content">
        {page === 'leaderboard' && (
          <>
            <div className="eyebrow-line"><span className="eyebrow-dot" /> YOUR DASHBOARD <span className="eyebrow-divider">/</span> <span className="eyebrow-muted">Academic year 2025–26</span></div>
            <div className="hero-row">
              <div>
                <div className="hero-date"><CalendarDays size={14} /> {today}</div>
                <h1>{greeting}, {me?.name?.split(' ')[0] || 'Mohit'} <span className="greeting-sparkle"><Sparkles size={27} strokeWidth={1.6} /></span></h1>
                <p className="hero-subtitle">{me?.college} <span>·</span> {me?.department} (Roll: {me?.rollNo})</p>
              </div>
              <div className="hero-actions">
                <div className="segment-control" role="group" aria-label="Leaderboard scope">
                  <button className={scope === 'college' ? 'selected' : ''} onClick={() => { setScope('college'); setCollegeFilter('All colleges') }}>Within College</button>
                  <button className={scope === 'state' ? 'selected' : ''} onClick={() => setScope('state')}>Within State</button>
                </div>
                <button className="button button-primary" onClick={() => setUploadOpen(true)}><Plus size={18} strokeWidth={2.3} /> Upload Certificate</button>
              </div>
            </div>

            <div className="stats-grid">
              <StatCard label={scope === 'state' ? 'STATE RANK' : 'COLLEGE RANK'} value={`#${scope === 'state' ? me?.stateRank ?? '--' : me?.collegeRank ?? '--'}`} detail={me?.stateRank <= 3 ? "Top 3 in Goa!" : "Verified standing"} icon={Medal} tone="gold" trend="up" />
              <StatCard label="CREDX SCORE" value={me?.scores?.overall?.toString() || '---'} suffix="/ 1000" detail="Powered by University Marks" icon={Trophy} tone="teal" trend="up" />
              <StatCard label="VERIFIED CREDENTIALS" value={me?.verifiedCredentialsCount?.toString().padStart(2, '0') || '00'} detail="Across skills" icon={FileBadge2} tone="blue" />
              <StatCard label="PROFILE VIEWS" value={me?.profileViews?.toString() || '---'} detail="Recruiter inquiries" icon={BriefcaseBusiness} tone="violet" trend="up" />
            </div>

            {me?.alerts?.[0] && (
              <div className="insight-banner">
                <div className="insight-icon"><Sparkles size={19} fill="currentColor" /></div>
                <div className="insight-copy"><strong>AI Strategic Insight</strong><span>{me.alerts[0]}</span></div>
                <button onClick={() => changePage('competitions')}>Explore opportunities <ArrowUpRight size={16} /></button>
              </div>
            )}

            <section className="board-panel">
              <div className="board-header">
                <div>
                  <div className="section-kicker"><span className="live-dot" /> LIVE RANKINGS <span className="section-line" /></div>
                  <h2>{scope === 'state' ? 'Goa State Leaderboard' : 'RIT Goa Leaderboard'}</h2>
                  <p>Recognizing the next generation of engineering talent in Goa.</p>
                </div>
                <div className="board-toolbar">
                  <div className="search-box">
                    <Search size={17} />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search students, colleges..." aria-label="Search leaderboard" />
                    {query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button>}
                  </div>
                  <div className="filter-container">
                    <button className={`filter-button ${filterOpen ? 'filter-active' : ''}`} onClick={() => setFilterOpen(!filterOpen)} aria-label="Filter colleges"><SlidersHorizontal size={17} /></button>
                    {filterOpen && (
                      <div className="filter-menu">
                        <strong>Filter by college</strong>
                        {['All colleges', 'RIT Goa', 'GEC Goa', 'PCCE Goa', 'DBCE Goa'].map(college => (
                          <button key={college} onClick={() => { setCollegeFilter(college); setFilterOpen(false) }}>
                            <span>{college}</span>{collegeFilter === college && <Check size={15} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="board-scope">
                <span><Users size={15} /> {scope === 'state' ? 'All Goa colleges' : 'Within College'}</span>
                <span className="scope-separator" />
                <span><ShieldCheck size={15} /> Verified profiles only</span>
                <span className="board-count">Showing {filteredStudents.length} students</span>
              </div>
              
              <div className="table-scroll">
                <table className="leaderboard-table">
                  <thead>
                    <tr><th>RANK</th><th>STUDENT</th><th>COLLEGE</th><th>ROLL NO.</th><th>TOTAL SCORE</th><th>POINT BREAKDOWN <span className="table-info" title="Academics /400 · Competitions /300 · Courses /300"><Info size={13} /></span></th><th></th></tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student: Student) => (
                      <tr key={student.id} className={student.id === me?.id ? 'your-row' : ''} onClick={() => openProfile(student)}>
                        <td><span className={`rank-number ${student.rank <= 3 ? `rank-${student.rank}` : ''}`}>{student.rank <= 3 ? <Medal size={16} /> : null}#{student.rank}</span></td>
                        <td>
                          <div className="student-cell">
                            <Avatar student={student} />
                            <span><strong>{student.name}</strong>{student.id === me?.id && <span className="you-badge">YOU</span>}</span>
                          </div>
                        </td>
                        <td className="college-cell">{student.college}</td>
                        <td className="roll-cell">{student.roll}</td>
                        <td><span className="score-cell">{student.score} <small>/ 1000</small></span></td>
                        <td>
                          <div className="point-badges">
                            <span className="point-badge point-academic"><span />{student.academics}<small>/400</small></span>
                            <span className="point-badge point-competition"><span />{student.competitions}<small>/300</small></span>
                            <span className="point-badge point-courses"><span />{student.courses}<small>/300</small></span>
                          </div>
                        </td>
                        <td><button className="profile-link" onClick={(e) => { e.stopPropagation(); openProfile(student) }}>View profile <ArrowUpRight size={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStudents.length === 0 && (
                  <div className="empty-state">
                    <Search size={24} /><strong>No students found</strong>
                    <p>Try a different search or college filter.</p>
                    <button onClick={() => { setQuery(''); setCollegeFilter('All colleges') }}>Clear filters</button>
                  </div>
                )}
              </div>
              <div className="board-footer">
                <div className="legend">
                  <span><i className="legend-dot academic" /> Academics</span>
                  <span><i className="legend-dot competition" /> Competitions</span>
                  <span><i className="legend-dot courses" /> Courses & Skills</span>
                </div>
                <span>Scores refresh after faculty verification <RotateCcw size={12} /></span>
              </div>
            </section>
            
            <div className="page-footer">
              <span><ShieldCheck size={15} /> Every credential is institution-verified.</span>
              <span>Built for Goa's future engineers <span className="footer-sparkle">✦</span></span>
            </div>
          </>
        )}

        {page === 'competitions' && (
          <section className="subpage">
            <div className="subpage-top">
              <div className="eyebrow-line"><span className="eyebrow-dot" /> OPPORTUNITIES <span className="eyebrow-divider">/</span> <span className="eyebrow-muted">AI Radar</span></div>
              <div className="subpage-heading">
                <div><h1>Find your next big thing<span className="heading-period">.</span></h1><p>Competitions worth your time, curated for your skills and ambitions.</p></div>
                <Tag tone="teal" icon={Sparkles}>Personalized for you</Tag>
              </div>
            </div>
            
            {me?.alerts?.[1] && (
              <div className="radar-callout">
                <div className="radar-orb"><Sparkles size={24} /></div>
                <div>
                  <span>YOUR AI OPPORTUNITY RADAR</span>
                  <h2>{(me?.scores?.competitions ?? 0) >= 250 ? "You're almost at your competition cap." : 'Competitions are your fastest way up.'}</h2>
                  <p>{me.alerts[1]}</p>
                </div>
                <span className="radar-decoration"><Zap size={100} /></span>
              </div>
            )}
            
            <div className="section-title-row">
              <div><div className="section-kicker"><span className="live-dot" /> ON THE HORIZON</div><h2>Upcoming competitions</h2></div>
              <span className="muted-count">{competitions.length} opportunities</span>
            </div>
            
            <div className="event-grid">
              {competitions.map((event: any) => (
                <article className="event-card" key={event.id}>
                  <div className="event-card-top">
                    <div className={`event-symbol symbol-${event.rec?.recommended ? 'teal' : 'blue'}`}><Trophy size={25} strokeWidth={1.8} /></div>
                    <span className="countdown"><Clock3 size={13} /> {event.daysLeft}d left</span>
                  </div>
                  {event.rec?.recommended && (
                    <div className="recommended"><Sparkles size={13} fill="currentColor" /> {event.rec.reason.toUpperCase()}</div>
                  )}
                  <h3>{event.title}</h3>
                  <div className="event-organizer"><MapPin size={15} /> {event.organizer} · {event.venue}</div>
                  <div className="event-date"><CalendarDays size={15} /> {event.date}</div>
                  <div className="event-tags">{event.tags.map((tag: string) => <Tag key={tag} tone={event.rec?.recommended ? 'teal' : 'blue'}>{tag}</Tag>)}</div>
                  <div className="event-card-bottom">
                    <button className="event-action" onClick={() => { 
                      setSavedEvents(prev => prev.includes(event.id) ? prev.filter(id => id !== event.id) : [...prev, event.id]); 
                      setToast(savedEvents.includes(event.id) ? 'Removed from your saved opportunities' : `${event.title} saved to your opportunities`) 
                    }}>
                      {savedEvents.includes(event.id) ? 'Saved to radar' : 'Save opportunity'} 
                      {savedEvents.includes(event.id) ? <Check size={16} /> : <ArrowUpRight size={16} />}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="bottom-note"><Info size={17} /> Competition points are awarded after you upload proof and your faculty verifies the achievement.</div>
          </section>
        )}

        {page === 'faculty' && (
          <section className="subpage">
            <div className="eyebrow-line"><span className="eyebrow-dot" /> FACULTY PORTAL <span className="eyebrow-divider">/</span> <span className="eyebrow-muted">{me?.collegeShort || 'College'} Desk</span></div>
            <div className="subpage-heading">
              <div><h1>Verification workspace<span className="heading-period">.</span></h1><p>Institutional Verification Workspace — {me?.collegeShort}</p></div>
              <Tag tone="teal" icon={ShieldCheck}>Institutional access</Tag>
            </div>
            
            <div className="workspace-summary">
              <div><span className="summary-icon amber"><Clock3 size={20} /></span><span><strong>{pending.length}</strong><small>Pending review</small></span></div>
              <div><span className="summary-icon green"><CheckCheck size={20} /></span><span><strong>24</strong><small>Verified this month</small></span></div>
              <div><span className="summary-icon blue"><Users size={20} /></span><span><strong>138</strong><small>Enrolled students</small></span></div>
            </div>
            
            <div className="section-title-row">
              <div><div className="section-kicker"><span className="live-dot" /> VERIFICATION DESK</div><h2>Pending submissions</h2></div>
              <span className="muted-count">{pending.length === 0 ? 'All caught up' : `${pending.length} awaiting review`}</span>
            </div>
            
            {pending.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {pending.map((cert: any) => (
                  <article className="verification-card" key={cert.id}>
                    <div className="verification-main">
                      <div className="document-icon"><FileText size={28} strokeWidth={1.5} /></div>
                      <div>
                        <div className="verification-label"><span className="pending-indicator" /> AWAITING VERIFICATION</div>
                        <h3>{cert.certificateTitle}</h3>
                        <p>Submitted by <strong>{cert.studentName}</strong> <span>({cert.studentRollNo})</span> · {cert.college}</p>
                        <div className="verification-tags">
                          <Tag icon={FileText}>{cert.fileType} · {cert.fileSize}</Tag>
                          <Tag icon={Clock3}>{timeAgo(cert.submittedAt)}</Tag>
                          <Tag tone="gold" icon={Award}>Award: {cert.awardType} (+{cert.pointsToAward} pts)</Tag>
                        </div>
                      </div>
                    </div>
                    <div className="verification-actions">
                      <button className="button button-primary" onClick={() => handleApprove(cert.id)}>
                        <Check size={18} /> Approve & Award Points
                      </button>
                      <button className="button button-secondary" onClick={() => handleReject(cert.id)}>Reject</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="workspace-empty">
                <span><CheckCheck size={29} /></span>
                <h3>All caught up!</h3><p>Every certificate in your queue has been reviewed.</p>
              </div>
            )}
            <div className="bottom-note"><ShieldCheck size={17} /> Faculty approval makes each achievement a trusted, verified credential.</div>
          </section>
        )}

        {page === 'recruiter' && (
          <section className="subpage">
            <div className="eyebrow-line"><span className="eyebrow-dot" /> RECRUITER VIEW <span className="eyebrow-divider">/</span> <span className="eyebrow-muted">Talent discovery</span></div>
            <div className="subpage-heading">
              <div><h1>Discover verified talent<span className="heading-period">.</span></h1><p>Find exceptional engineering students backed by real, faculty-verified achievements.</p></div>
              <Tag tone="teal" icon={ShieldCheck}>Verified talent index</Tag>
            </div>
            
            <div className="recruiter-hero">
              <div>
                <span className="recruiter-eyebrow"><Sparkles size={16} /> THE CREDX ADVANTAGE</span>
                <h2>Beyond resumes.<br /><em>Real proof of potential.</em></h2>
                <p>Explore a living index of Goa's emerging engineering talent, with every score grounded in verified academics, competitions, and skills.</p>
                <button className="button button-primary" onClick={() => { setPage('leaderboard'); setScope('state') }}>Explore leaderboard <ArrowRight size={17} /></button>
              </div>
              <div className="recruiter-visual">
                <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
                <div className="visual-center"><ShieldCheck size={38} /><strong>100%</strong><span>VERIFIED PROFILES</span></div>
                <div className="visual-chip chip-one"><Trophy size={16} /> Top talent</div>
                <div className="visual-chip chip-two"><FileCheck2 size={16} /> Real credentials</div>
              </div>
            </div>
            
            <div className="section-title-row">
              <div><div className="section-kicker"><span className="live-dot" /> SPOTLIGHT</div><h2>Top talent, ready to connect</h2></div>
              <span className="muted-count">Goa state top 6 · roll numbers masked</span>
            </div>
            
            <div className="talent-grid">
              {students.slice(0, 6).map((student: Student) => (
                <button className="talent-card" key={student.id} onClick={() => openProfile(student)}>
                  <div className="talent-card-top">
                    <Avatar student={student} size="large" />
                    <Tag tone={student.rank === 1 ? 'gold' : 'teal'} icon={Medal}>Rank #{student.rank}</Tag>
                  </div>
                  <h3>{student.name}</h3>
                  <p>{student.college} · {student.roll.split('-')[0]}-**</p>
                  <div className="talent-card-score"><span>CredX Score</span><strong>{student.score}<small> / 1000</small></strong></div>
                  <div className="talent-card-link">View talent snapshot <ArrowUpRight size={16} /></div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Profile Drawer */}
      {selected && (
        <div className="drawer-layer">
          <div className="drawer-backdrop" onClick={() => setSelected(null)} />
          <aside className="profile-drawer" role="dialog" aria-modal="true">
            <div className="drawer-topline"><span><Sparkles size={15} /> TALENT SNAPSHOT</span><IconButton icon={X} label="Close profile" onClick={() => setSelected(null)} /></div>
            
            <div className="drawer-content">
              <div className="profile-intro">
                <Avatar student={selected} size="large" />
                <div><h2>{selected.name}</h2><p>{page === 'recruiter' ? `${selected.roll.split('-')[0]}-**` : selected.roll} · {selected.college}</p></div>
              </div>
              <Tag tone="teal" icon={ShieldCheck}>Profile Verified</Tag>
              
              <div className="dark-score-card">
                <div className="score-card-head"><span>CREDX SCORE</span><Trophy size={20} /></div>
                <div className="big-score">{selected.score}<span> / 1000</span></div>
                <Progress value={selected.score} max={1000} tone="teal" />
                <div className="score-card-bottom"><span>Top engineering talent in Goa</span><span>Rank #{selected.rank} <ArrowUpRight size={14} /></span></div>
              </div>
              
              <div className="drawer-section">
                <div className="drawer-section-heading"><h3>Score breakdown</h3><span>3 CATEGORIES</span></div>
                <div className="breakdown-list">
                  <Breakdown label="Academics" value={selected.academics} max={400} tone="academic" icon={GraduationCap} />
                  <Breakdown label="Competitions" value={selected.competitions} max={300} tone="competition" icon={Trophy} />
                  <Breakdown label="Courses & Skills" value={selected.courses} max={300} tone="courses" icon={FileBadge2} />
                </div>
              </div>
              
              <div className="drawer-section">
                <div className="drawer-section-heading"><h3>Verified badges</h3><span>{selected.achievements?.length || 0} EARNED</span></div>
                <div className="badge-list">
                  {selected.achievements?.length > 0 ? selected.achievements.map((ach: string, i: number) => (
                    <div key={i}>
                      <span className="badge-icon gold"><Award size={18} /></span>
                      <span><strong>{ach}</strong><small>Faculty Verified</small></span>
                      <ShieldCheck size={16} className="verified-check" />
                    </div>
                  )) : (
                    <p style={{ fontSize: '11px', color: '#888' }}>No verified badges yet.</p>
                  )}
                </div>
              </div>
              
              {selected.faculty && (
                <div className="faculty-contact">
                  <span className="contact-icon"><GraduationCap size={19} /></span>
                  <div>
                    <span className="contact-label">FACULTY INCHARGE DESK</span>
                    <strong>{selected.faculty.name}</strong><p>{selected.faculty.designation}</p>
                    <a>{selected.faculty.email} <ExternalLink size={12} /></a>
                  </div>
                </div>
              )}
            </div>
            
            <div className="drawer-bottom">
              <button 
                className="drawer-contact-button" 
                disabled={selected.id === me?.id}
                onClick={() => {
                  if (page === 'recruiter') setInquiryTarget(selected)
                  else { setSelected(null); changePage('recruiter'); setToast('Recruiter View: open a profile here to send a hiring inquiry.') }
                }}
              >
                <Mail size={17} /> {selected.id === me?.id ? 'This is your profile' : 'Contact Faculty Incharge for Hiring Inquiry'} <ArrowRight size={16} />
              </button>
              <p><ShieldCheck size={13} /> All credentials verified by their institution</p>
            </div>
          </aside>
        </div>
      )}

      {/* Recruiter Inquiry Modal */}
      {inquiryTarget && (
        <div className="modal-layer">
          <div className="modal-backdrop" onClick={() => setInquiryTarget(null)} />
          <div className="upload-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div className="modal-icon"><BriefcaseBusiness size={23} /></div>
              <IconButton icon={X} label="Close" onClick={() => setInquiryTarget(null)} />
            </div>
            <h2>Official Recruitment Inquiry</h2>
            <p>Routed directly to <strong>{inquiryTarget.faculty?.name || 'T&P Incharge'}</strong> ({inquiryTarget.college}).</p>
            
            <form onSubmit={handleSendInquiry}>
              <div style={{ background: '#f8fafb', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '11px' }}>
                <strong>Target Candidate: {inquiryTarget.name}</strong><br/>
                <span style={{ color: '#778596' }}>CredX Score: {inquiryTarget.score} · Masked Roll: {inquiryTarget.roll.split('-')[0]}-**</span>
              </div>
              
              <label className="form-label">Hiring Company / Hub</label>
              <input className="form-input" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
              
              <label className="form-label">Official Recruiter Email</label>
              <input type="email" className="form-input" value={recruiterEmail} onChange={e => setRecruiterEmail(e.target.value)} required />
              
              <div className="modal-actions">
                <button type="button" className="button button-secondary" onClick={() => setInquiryTarget(null)}>Cancel</button>
                <button type="submit" className="button button-primary" disabled={isInquiring}>
                  <Send size={15} style={{marginRight: '6px'}} /> {isInquiring ? 'Routing...' : 'Send via Faculty Desk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="modal-layer">
          <div className="modal-backdrop" onClick={() => setUploadOpen(false)} />
          <div className="upload-modal" role="dialog" aria-modal="true" aria-label="Upload certificate">
            <div className="modal-header">
              <div className="modal-icon"><CloudUpload size={23} /></div>
              <IconButton icon={X} label="Close upload" onClick={() => setUploadOpen(false)} />
            </div>
            <h2>Upload a certificate</h2>
            <p>Submit an achievement for faculty verification and earn CredX points.</p>
            
            <form onSubmit={handleUploadSubmit}>
              <label className="form-label">Achievement name</label>
              <input className="form-input" value={certificateTitle} onChange={e => setCertificateTitle(e.target.value)} placeholder="e.g. Smart Goa Hackathon" required />
              
              <label className="form-label">Award Type</label>
              <div style={{ position: 'relative' }}>
                <select className="form-input" value={awardType} onChange={e => setAwardType(e.target.value)} style={{ appearance: 'none' }}>
                  <option value="Winner">Winner (+100 pts)</option>
                  <option value="Runner-up">Runner-up (+70 pts)</option>
                  <option value="Finalist">Finalist (+40 pts)</option>
                  <option value="Participant">Participant (+20 pts)</option>
                </select>
                <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '12px', color: '#9aa7b7', pointerEvents: 'none' }} />
              </div>
              
              <label className="form-label">Certificate file</label>
              <label className="upload-zone" style={{ position: 'relative', overflow: 'hidden' }}>
                <CloudUpload size={25} />
                <strong>{file ? file.name : 'Click to choose a file'}</strong>
                <span>{file ? 'Ready to submit' : 'PDF or PNG · Max 10 MB'}</span>
                <input className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] || null)} required style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </label>
              
              <div className="modal-actions">
                <button type="button" className="button button-secondary" onClick={() => setUploadOpen(false)}>Cancel</button>
                <button type="submit" className="button button-primary" disabled={isUploading}>
                  {isUploading ? 'Submitting...' : 'Submit for verification'} <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={17} />{toast}
          <button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={14} /></button>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, suffix, detail, icon: Icon, tone, trend }: { label: string; value: string; suffix?: string; detail: string; icon: LucideIcon; tone: string; trend?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon icon-${tone}`}><Icon size={20} strokeWidth={1.9} /></span>
      </div>
      <div className="stat-value">{value} {suffix && <small>{suffix}</small>}</div>
      <div className={`stat-detail ${tone === 'gold' ? 'detail-gold' : ''}`}>
        {trend && <ArrowUpRight size={14} />}{detail}
      </div>
    </div>
  )
}

function Breakdown({ label, value, max, tone, icon: Icon }: { label: string; value: number; max: number; tone: string; icon: LucideIcon }) {
  return (
    <div className="breakdown-item">
      <div className="breakdown-label">
        <span><span className={`breakdown-icon breakdown-${tone}`}><Icon size={15} /></span>{label}</span>
        <strong>{value}<small> / {max}</small></strong>
      </div>
      <Progress value={value} max={max} tone={tone} />
    </div>
  )
}