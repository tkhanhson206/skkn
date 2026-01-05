
export type PedagogicalStyle = 'Logic & Chặt chẽ' | 'Truyền cảm hứng' | 'Đổi mới & Đột phá';

export interface SKKNInput {
  subject: string;
  level: string;
  grade: string;
  topic: string;
  target: string;
  useAI: boolean;
  style: PedagogicalStyle;
}

export interface SKKNSection {
  id: string;
  title: string;
  content: string;
  originalContent?: string;
  refinementComment?: string;
  status: 'idle' | 'refining' | 'comparing';
}

export interface AuditCriterion {
  label: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface SKKNAudit {
  totalScore: number;
  criteria: AuditCriterion[];
  overallAdvice: string;
  prizePrediction: string;
}

export interface EvidenceItem {
  type: 'Photo' | 'Form' | 'Product' | 'Video';
  description: string;
  purpose: string;
}

export type RefinementLevel = 'Cơ bản' | 'Nâng cao' | 'Xuất sắc';
