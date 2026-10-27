import type { ActivityKey, CampaignKind, LabelFamily, ListKind, MediaCategory, Objective, Status } from "./constants";

export interface Board {
  id: string;
  name: string;
  background: string;
  position: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardList {
  id: string;
  boardId: string;
  name: string;
  color: string | null;
  kind: ListKind;
  /** Lundi de la semaine (AAAA-MM-JJ) pour une liste hebdomadaire. */
  weekStart: string | null;
  position: number;
  archivedAt: string | null;
}

export interface Label {
  id: string;
  family: LabelFamily;
  key: string | null;
  name: string;
  color: string;
  position: number;
}

export interface ChecklistItem {
  id: string;
  cardId: string;
  text: string;
  done: boolean;
  position: number;
}

export interface CardLink {
  name: string;
  url: string;
}

export interface Card {
  id: string;
  boardId: string;
  listId: string;
  position: number;
  title: string;
  /** Description interne (consignes, contexte). */
  description: string;
  /** Date-heure locale "AAAA-MM-JJTHH:MM" de publication. */
  scheduledAt: string | null;
  /** Date de production (AAAA-MM-JJ). */
  productionDate: string | null;
  /** Date limite de validation (AAAA-MM-JJ). */
  validationDate: string | null;
  status: Status;
  objective: Objective | null;
  target: string;
  campaignId: string | null;
  assigneeId: string | null;
  hook: string;
  caption: string;
  script: string;
  brief: string;
  cta: string;
  coverMediaId: string | null;
  parentCardId: string | null;
  links: CardLink[];
  labelIds: string[];
  attachmentIds: string[];
  checklist: ChecklistItem[];
  commentCount: number;
  archivedAt: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  cardId: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface CardEvent {
  id: string;
  cardId: string;
  author: string;
  type: string;
  detail: string;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface Campaign {
  id: string;
  name: string;
  kind: CampaignKind;
  objective: string;
  brief: string;
  startDate: string;
  endDate: string;
  activities: ActivityKey[];
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
  activity: ActivityKey | null;
  tags: string[];
  rightsChecked: boolean;
  notes: string;
  isDemo: boolean;
  createdAt: string;
}

export interface Settings {
  /** Répartition cible par activité, en % (somme ≈ 100). */
  balanceTargets: Record<string, number>;
  /** Checklist appliquée aux nouvelles cartes. */
  defaultChecklist: string[];
  autoChecklist: boolean;
}

export interface BoardData {
  board: Board;
  lists: BoardList[];
  cards: Card[];
}
