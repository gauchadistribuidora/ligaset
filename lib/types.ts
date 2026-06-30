export type MemberRole = "owner" | "admin" | "player";
export type MemberStatus = "active" | "pending" | "inactive" | "suspended";
export type TournamentStatus = "draft" | "ongoing" | "finished";
export type MatchStatus = "scheduled" | "ongoing" | "finished";
export type PaymentStatus = "paid" | "pending" | "overdue" | "exempt";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  color: string;
  owner_id: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string | null;
  role: MemberRole;
  status: MemberStatus;
  name: string | null;
  phone: string | null;
  email: string | null;
  nickname: string | null;
  level: string | null;
  joined_at: string;
  profile?: Profile;
}

export interface GroupSettings {
  group_id: string;
  default_game_format: number;
  tie_break: boolean;
  monthly_fee: number;
  due_day: number;
  pix_key: string | null;
}

export interface Tournament {
  id: string;
  group_id: string;
  name: string;
  date: string | null;
  location: string | null;
  courts: number;
  category: string | null;
  game_format: number;
  tie_break: boolean;
  status: TournamentStatus;
  created_by: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string | null;
  name: string | null;
  seed: number | null;
}

export interface Match {
  id: string;
  tournament_id: string;
  phase: string;
  group_label: string | null;
  court: number | null;
  play_order: number | null;
  team_a_id: string | null;
  team_b_id: string | null;
  status: MatchStatus;
  result?: MatchResult | null;
}

export interface MatchResult {
  id: string;
  match_id: string;
  games_a: number;
  games_b: number;
  winner_team_id: string | null;
}

export interface Payment {
  id: string;
  group_id: string;
  user_id: string;
  amount: number;
  reference_month: string;
  due_date: string | null;
  status: PaymentStatus;
  receipt_url: string | null;
  paid_at: string | null;
  profile?: Profile;
}

export interface RankingRow {
  group_id: string;
  member_id: string;
  user_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  games_played: number;
  wins: number;
  losses: number;
  points: number;
  games_for: number;
  games_against: number;
  game_diff: number;
  win_pct: number;
}
