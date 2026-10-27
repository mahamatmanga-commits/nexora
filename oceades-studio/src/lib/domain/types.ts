import type {
  Activity,
  CampaignKind,
  Format,
  MediaCategory,
  Objective,
  Platform,
  Status,
} from "./constants";
import type { Checklist } from "./schemas";

export interface Post {
  id: string;
  title: string;
  /** Date-heure locale "AAAA-MM-JJTHH:MM", ou null pour une idée non planifiée. */
  scheduledAt: string | null;
  platform: Platform;
  activity: Activity;
  format: Format;
  objective: Objective;
  status: Status;
  description: string;
  hook: string;
  cta: string;
  notes: string;
  campaignId: string | null;
  mediaIds: string[];
  checklist: Checklist;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  kind: CampaignKind;
  objective: string;
  startDate: string;
  endDate: string;
  activities: Activity[];
  targetAudience: string;
  keyMessages: string;
  color: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: MediaCategory;
  tags: string[];
  rightsChecked: boolean;
  notes: string;
  isDemo: boolean;
  createdAt: string;
}

export type { Checklist };
