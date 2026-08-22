// ============================================================
// KesslerX Handoff Types
// TypeScript interfaces for the Responsibility Transfer workflow
// ============================================================

export interface HandoffUser {
  user_id: string;
  name: string;
  role: string;
  status: 'Available' | 'Offline' | 'Busy';
  avatar_initials: string;
}

export interface HandoffEvent {
  event_id: string;
  title: string;
  satellite?: string;
  object?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  tca?: string;
  tca_minutes?: number;
  miss_distance_km?: number;
  collision_probability?: number;
  status: string;
  current_owner_id: string;
  current_owner_role: string;
  next_action?: string;
  deadline?: string;
  orbit?: string;
  altitude_km?: number;
  relative_velocity_km_s?: number;
  risk_trend?: string;
  uncertainty?: string;
  work_completed?: string[];
  current_decision?: string;
  constraints?: string[];
  updated_at?: string;
  owner?: HandoffUser | null;
}

export interface Handoff {
  handoff_id: string;
  event_id: string;
  from_user_id: string;
  from_role: string;
  to_user_id: string;
  to_role: string;
  reason: string;
  priority: string;
  next_action: string;
  deadline: string;
  message: string;
  include_evidence: boolean;
  generated_note: string;
  status: HandoffStatusType;
  created_at: string;
  confirmed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  escalated_at: string | null;
  escalation_target: string | null;
  clarification_messages: ClarificationMessage[];
  // Enriched fields from API
  from_user?: HandoffUser | null;
  to_user?: HandoffUser | null;
  event?: HandoffEvent | null;
  history?: HandoffHistoryEntry[];
}

export type HandoffStatusType =
  | 'Draft'
  | 'Awaiting Acceptance'
  | 'Accepted'
  | 'Clarification Requested'
  | 'Rejected'
  | 'Escalated'
  | 'Unassigned Emergency'
  | 'Closed';

export interface ClarificationMessage {
  from: string;
  message: string;
  timestamp: string;
}

export interface HandoffHistoryEntry {
  history_id: string;
  handoff_id: string;
  event_id: string;
  action: string;
  actor_id: string;
  previous_owner: string;
  new_owner: string;
  timestamp: string;
  comment: string;
}

export interface TimelineEntry {
  timeline_id: string;
  event_id: string;
  handoff_id: string;
  action: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  previous_owner: string;
  new_owner: string;
  timestamp: string;
  comment: string;
}

export interface HandoffCreatePayload {
  to_user_id: string;
  reason: string;
  priority: string;
  next_action: string;
  deadline: string;
  message: string;
  include_evidence: boolean;
}

export const HANDOFF_REASONS = [
  'Shift Change',
  'Escalation',
  'Unavailable',
  'Needs Approval',
  'Requires Specialist',
  'Other',
] as const;

export const REJECT_REASONS = [
  'Unavailable',
  'Wrong specialist',
  'Insufficient information',
  'Workload',
  'Other',
] as const;
