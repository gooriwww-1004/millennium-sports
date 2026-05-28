// lib/api.ts — 야구 시뮬레이터 API 클라이언트
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export interface BaseballInput {
  home_team: string; away_team: string; league: string
  home_odds: number; away_odds: number
  home_pitcher?: string; away_pitcher?: string
  park_factor?: string
  home_form5?: number; away_form5?: number
  home_bullpen?: string; away_bullpen?: string
  home_ops?: number; away_ops?: number
  home_era?: number; away_era?: number
}

export interface WinProbs { home: number; away: number }
export interface BaseballEV { home: number; away: number; home_grade: string; away_grade: string }
export interface EventFlags {
  high_ev: boolean; value_home_found: boolean; value_away_found: boolean
  ace_vs_back: boolean; hitter_park_warning: boolean
  bullpen_risk: boolean; all_ev_negative: boolean
}
export interface AdjustmentInfo {
  home_pitcher_label: string; away_pitcher_label: string; park_label: string
  home_form_label: string; away_form_label: string
  home_run_exp: number; away_run_exp: number
}
export interface ScoreEntry { score: string; prob: number }
export interface AnalysisResult {
  elapsed_sec: number; home_team: string; away_team: string; league: string
  home_run_exp: number; away_run_exp: number
  probabilities: WinProbs; market_probs: WinProbs; sim_probs: WinProbs
  ev: BaseballEV; top_scores: ScoreEntry[]
  events: EventFlags; adjustments: AdjustmentInfo
  summary: string; disclaimer: string
}
export interface TeamInfo {
  name: string; league: string; ops?: number; era?: number
  home_form?: number; park?: string; div?: string; city?: string
}
export interface MatchInfo {
  league: string; home_team: string; away_team: string
  kst_date: string; kst_time: string
  home_odds: number | null; away_odds: number | null
  bookmaker: string; status: string
}

export async function runAnalysis(data: BaseballInput): Promise<AnalysisResult> {
  const res = await fetch(`${API}/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail||`오류 ${res.status}`) }
  return res.json()
}

export async function getTeams(league: string = 'ALL'): Promise<TeamInfo[]> {
  const res = await fetch(`${API}/teams?league=${league}`)
  if (!res.ok) return []
  const d = await res.json()
  return d.teams || []
}

export async function getMatches(league: string = 'ALL', days: number = 3): Promise<Record<string, MatchInfo[]>> {
  const res = await fetch(`${API}/matches?league=${league}&days=${days}`)
  if (!res.ok) return {}
  const d = await res.json()
  return d.by_date || {}
}

export async function getPresets() {
  const res = await fetch(`${API}/presets`)
  if (!res.ok) return { pitchers: [], parks: [], bullpens: [] }
  return res.json()
}

export const formatEV  = (ev: number) => `${ev>=0?'+':''}${(ev*100).toFixed(1)}%`
export const formatProb = (p: number) => `${(p*100).toFixed(1)}%`
export const gradeClass = (g: string) => `grade-${g.toLowerCase()}`
