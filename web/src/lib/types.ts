export type Verdict = "human" | "bot";

export interface Trade {
  id: string;
  ts: string; // HH:MM:SS
  side: "BUY" | "SELL";
  pair: string;
  size: number;
  price: number;
  pnl: number; // realized on close, 0 otherwise
  suspectId: number;
}

export interface Tell {
  label: string;
  hint: string;
}

export interface SuspectStats {
  trades24h: number;
  winRate: number; // %
  avgHoldMin: number;
  maxDrawdown: number; // negative %
  volatility: number;
}

export interface Suspect {
  id: number;
  codename: string;
  alias: string;
  isBot: boolean; // ground truth, revealed at round close
  series: number[]; // 24h P&L sparkline
  returnPct: number;
  stats: SuspectStats;
  tells: Tell[]; // exactly 2, unique across the round
  crowdBotPct: number; // % of detectives voting bot
  activity: number[]; // 24 hourly intensity 0..1
  trades: Trade[];
}

export interface SlipEntry {
  suspectId: number;
  verdict: Verdict;
  confidence: number; // 0..1 beyond neutral
  multiplier: number;
}

export type WalletState =
  | { status: "disconnected" }
  | { status: "connecting" }
  | { status: "connected"; address: string; balance: number };

export interface DetectiveRow {
  rank: number;
  handle: string;
  title: string;
  accuracy: number;
  winnings: number;
  rounds: number;
}

export interface AgentRow {
  rank: number;
  agent: string;
  builder: string;
  foolRate: number;
  roundsSurvived: number;
  status: "active" | "retired";
}

export interface RoundHistory {
  round: number;
  date: string;
  called: number;
  correct: number;
  net: number;
}
