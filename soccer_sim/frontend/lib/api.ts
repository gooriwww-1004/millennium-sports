// lib/api.ts — FastAPI 백엔드 통신
// Millennium Session · 유리 (연구실장)

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────

export interface AnalysisInput {
  home_team: string
  away_team: string
  home_attack?: number
  home_defense?: number
  away_attack?: number
  away_defense?: number
  home_odds: number
  draw_odds: number
  away_odds: number
  home_injured?: boolean
  away_injured?: boolean
  home_injury?: string
  away_injury?: string
  home_form?: number
  away_form?: number
  h2h_reversals?: number
}

export interface Probabilities {
  home: number
  draw: number
  away: number
}

export interface EVResult {
  home: number
  draw: number
  away: number
  home_grade: 'A' | 'B' | 'C'
  draw_grade: 'A' | 'B' | 'C'
  away_grade: 'A' | 'B' | 'C'
}

export interface EventFlags {
  value_home_found: boolean
  value_away_found: boolean
  dominant_gap: boolean
  high_ev: boolean
  h2h_reversal_warning: boolean
  draw_likely: boolean
  all_ev_negative: boolean
}

export interface EventMessage {
  event: string
  text: string
  clip: string
  color: string
  icon: string
}

export interface ScoreEntry {
  score: string
  prob: number
}

export interface AnalysisResult {
  status: string
  elapsed_sec: number
  home_team: string
  away_team: string
  home_xg: number
  away_xg: number
  probabilities: Probabilities
  market_probs: Probabilities
  sim_probs: Probabilities
  ev: EVResult
  top_scores: ScoreEntry[]
  events: EventFlags
  event_messages: EventMessage[]
  summary: string
  disclaimer: string
}

export interface TeamInfo {
  id: string
  name: string
  league: string
  attack_rating: number
  defense_rating: number
  home_form: number
  away_form: number
}

// ─────────────────────────────────────────
// API 함수
// ─────────────────────────────────────────

export async function runAnalysis(data: AnalysisInput): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `서버 오류: ${res.status}`)
  }
  return res.json()
}

export async function searchTeams(query: string): Promise<TeamInfo[]> {
  if (!query || query.length < 1) return []
  const res = await fetch(`${API_BASE}/teams/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.teams || []
}

export async function getTeamInfo(name: string): Promise<TeamInfo | null> {
  const res = await fetch(`${API_BASE}/teams/${encodeURIComponent(name)}`)
  if (!res.ok) return null
  return res.json()
}

// ─────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────

export function formatEV(ev: number): string {
  return `${ev >= 0 ? '+' : ''}${(ev * 100).toFixed(1)}%`
}

export function formatProb(p: number): string {
  return `${(p * 100).toFixed(1)}%`
}

export function gradeColor(grade: 'A' | 'B' | 'C'): string {
  return grade === 'A' ? 'var(--accent)' : grade === 'B' ? 'var(--gold)' : 'var(--red)'
}

export function gradeClass(grade: 'A' | 'B' | 'C'): string {
  return `grade-${grade.toLowerCase()}`
}
