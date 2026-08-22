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

export const DEFAULT_DEMO_USERS: HandoffUser[] = [
  {
    user_id: 'anish',
    name: 'Anish',
    role: 'Flight Dynamics Analyst',
    status: 'Available',
    avatar_initials: 'AN',
  },
  {
    user_id: 'madhura',
    name: 'Madhura',
    role: 'Mission Operations Lead',
    status: 'Available',
    avatar_initials: 'MA',
  },
  {
    user_id: 'ravi',
    name: 'Ravi',
    role: 'Mission Manager',
    status: 'Available',
    avatar_initials: 'RA',
  },
  {
    user_id: 'priya',
    name: 'Priya',
    role: 'On-Call Safety Analyst',
    status: 'Available',
    avatar_initials: 'PR',
  },
  {
    user_id: 'offline_user',
    name: 'Vikram',
    role: 'Flight Dynamics Team',
    status: 'Offline',
    avatar_initials: 'VI',
  },
];

export const DEFAULT_DEMO_EVENTS: HandoffEvent[] = [
  {
    event_id: 'CX-9921-A',
    title: 'STARLINK-3021 vs DEBRIS-88172',
    satellite: 'STARLINK-3021',
    object: 'DEBRIS-88172',
    severity: 'CRITICAL',
    tca: '11:42:15 UTC',
    tca_minutes: 12,
    miss_distance_km: 0.12,
    collision_probability: 0.098,
    status: 'Under Review',
    current_owner_id: 'anish',
    current_owner_role: 'Flight Dynamics Analyst',
    next_action: 'Validate Scenario B and prepare burn plan',
    deadline: '2026-08-22T12:30:00Z',
    orbit: 'LEO',
    altitude_km: 542,
    relative_velocity_km_s: 14.2,
    risk_trend: 'Increasing',
    uncertainty: '±15m radial, ±45m along-track',
    work_completed: [
      'Initial CDM processed from 18 SDS',
      'SGP4 propagation run with latest TLE set',
      '3 Monte Carlo scenarios analyzed (A, B, C)',
      'Scenario A: nominal miss 142m, Pc = 9.8e-2',
      'Scenario B: perturbed drag, pending validation',
      'Notification sent to STARLINK operations team',
    ],
    current_decision: 'Awaiting Scenario B validation before recommending CAM. Drag coefficient uncertainty may significantly alter miss distance prediction.',
    constraints: [
      'Scenario B uses estimated drag coefficient (no recent calibration)',
      'STARLINK-3021 has limited propellant margin',
      'Debris object has no active tracking beacon',
      'TCA window does not allow multiple maneuver attempts',
    ],
  },
  {
    event_id: 'CX-8840-B',
    title: 'ONEWEB-0142 vs COSMOS-2251-DEB',
    satellite: 'ONEWEB-0142',
    object: 'COSMOS-2251-DEB',
    severity: 'HIGH',
    tca: '12:05:40 UTC',
    tca_minutes: 35,
    miss_distance_km: 0.38,
    collision_probability: 0.034,
    status: 'Under Review',
    current_owner_id: 'anish',
    current_owner_role: 'Flight Dynamics Analyst',
    next_action: 'Perform conjunction refinement with latest radar track',
    deadline: '2026-08-22T13:00:00Z',
    orbit: 'LEO',
    altitude_km: 1200,
    relative_velocity_km_s: 11.8,
    risk_trend: 'Stable',
    uncertainty: '±25m radial, ±80m along-track',
    work_completed: [
      'LeoLabs radar track incorporated',
      'Covariance scaling validated',
      'Evasion delta-v budget estimated at 0.42 m/s',
    ],
    current_decision: 'Hold for next radar pass before executing maneuver.',
    constraints: [
      'Maneuver execution window opens in 20 minutes',
    ],
  },
  {
    event_id: 'CX-4122-C',
    title: 'ISS (ZARYA) vs CZ-4C-DEB',
    satellite: 'ISS (ZARYA)',
    object: 'CZ-4C-DEB',
    severity: 'MEDIUM',
    tca: '14:22:00 UTC',
    tca_minutes: 170,
    miss_distance_km: 1.45,
    collision_probability: 0.0008,
    status: 'Monitoring',
    current_owner_id: 'madhura',
    current_owner_role: 'Mission Operations Lead',
    next_action: 'Monitor next two Space-Track CDM updates',
    deadline: '2026-08-22T15:00:00Z',
    orbit: 'LEO',
    altitude_km: 418,
    relative_velocity_km_s: 13.9,
    risk_trend: 'Decreasing',
    uncertainty: '±50m radial',
    work_completed: [
      'NASA TOPO conjunction summary reviewed',
      'Yellow threshold evaluation complete',
    ],
    current_decision: 'Green status maintained. No PDAM required at current probability.',
    constraints: [
      'Crew sleep period commences at 21:30 UTC',
    ],
  },
];

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

