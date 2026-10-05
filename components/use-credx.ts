'use client'
import { useCallback, useEffect, useState } from 'react'

export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
export const ME = 'stud_mohit'

const ACCENTS = [
  'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-700', 'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
]

export type Student = {
  id: string; rank: number; name: string; initials: string; avatar: string; college: string; roll: string
  score: number; academics: number; competitions: number; courses: number; accent: string
  achievements: string[]; faculty?: { name: string; email: string; designation: string }
}

const AVATARS = ['teal', 'peach', 'lavender', 'pink', 'blue', 'amber', 'sky', 'rose', 'mint', 'violet']
const pick = (id: string) => AVATARS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATARS.length]

const toUi = (s: any, scope: 'college' | 'state'): Student => ({
  id: s.id, avatar: pick(s.id), rank: scope === 'state' ? s.stateRank : s.collegeRank, name: s.name, initials: s.avatar,
  college: s.collegeShort, roll: s.rollNo, score: s.scores.overall, academics: s.scores.academics,
  competitions: s.scores.competitions, courses: s.scores.courses,
  accent: ACCENTS[s.name.length % ACCENTS.length], achievements: s.achievements ?? [], faculty: s.facultyIncharge,
})

async function j(path: string, init?: RequestInit) {
  const r = await fetch(`${API}${path}`, init)
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail ?? r.statusText)
  return r.json()
}

export function useCredX(scope: 'college' | 'state', publicView = false) {
  const [students, setStudents] = useState<Student[]>([])
  const [me, setMe] = useState<any>(null)
  const [meStudent, setMeStudent] = useState<Student | null>(null)
  const [competitions, setCompetitions] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const meDoc = await j(`/api/students/${ME}`)
      const [lb, comps, recs, pend] = await Promise.all([
        j(scope === 'college' ? `/api/leaderboard?scope=college&college=${encodeURIComponent(meDoc.college)}` : `/api/leaderboard?public=${publicView}&limit=${publicView ? 50 : 100}`),
        j('/api/competitions'), j(`/api/recommendations/${ME}`), j(`/api/faculty/pending-certificates?college=${encodeURIComponent(meDoc.college)}`),
      ])
      const recMap = Object.fromEntries(recs.recommendations.map((r: any) => [r.id, r]))
      setStudents(lb.map((s: any) => toUi(s, scope)).sort((a: Student, b: Student) => a.rank - b.rank))
      setMe({ ...meDoc, alerts: recs.alerts })
      setMeStudent(toUi(meDoc, scope))
      setCompetitions(comps.map((c: any) => ({ ...c, rec: recMap[c.id] })))
      setPending(pend); setError(null)
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }, [scope, publicView])

  useEffect(() => { refresh() }, [refresh])

  const upload = async (file: File, eventName: string, awardType: string) => {
    const fd = new FormData()
    fd.append('student_id', ME); fd.append('event_name', eventName); fd.append('award_type', awardType); fd.append('file', file)
    await j('/api/certificates/upload', { method: 'POST', body: fd }); await refresh()
  }
  const approve = async (id: string) => { const r = await j(`/api/faculty/approve/${id}`, { method: 'POST' }); await refresh(); return r }
  const reject = async (id: string) => { await j(`/api/faculty/reject/${id}`, { method: 'POST' }); await refresh() }
  const viewProfile = async (id: string) => { try { await j(`/api/students/${id}?view=true`); if (id === ME) await refresh() } catch {} }
  const reset = async () => { await j('/api/demo/reset', { method: 'POST' }); await refresh() }
  const inquire = (studentId: string, company: string, recruiterEmail: string, message: string) =>
    j('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, company, recruiterEmail, message }) })

  return { students, me, meStudent, viewProfile, competitions, pending, error, loading, refresh, upload, approve, reject, reset, inquire }
}