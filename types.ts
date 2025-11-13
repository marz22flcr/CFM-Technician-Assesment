
export interface User {
  name: string;
  email: string;
  id: string;
  userId: string;
}

export interface Question {
  id: string;
  text: string;
  choices: Record<string, string>;
  correct: string;
}

export interface Module {
  id: string;
  title: string;
  itemCount: number;
  questions: Question[];
}

export interface ExamData {
  totalQuestions: number;
  modules: Module[];
}

export interface ModuleResult {
  score: number;
  total: number;
}

export interface ExamSession {
  currentModuleIndex: number;
  answers: Record<string, string>;
  moduleResults: Record<string, ModuleResult>;
  submittedModules: Record<string, boolean>;
}

export interface ExamRecord {
  id?: string;
  user: User;
  timestamp: string;
  moduleResults: Record<string, ModuleResult>;
  answers: Record<string, string>;
  totalScore: number;
  totalPossible: number;
}

export type View = 'auth' | 'lobby' | 'exam' | 'review' | 'admin-login' | 'admin';

export type SortKey = 'name' | 'timestamp' | 'totalscore';
export type SortDirection = 'asc' | 'desc';

export interface ModalDetails {
  title: string;
  score: number;
  total: number;
  percent: string;
}

export interface ModalState {
  title: string;
  message: string;
  detailTitle?: string;
  details?: ModalDetails[] | null;
  isError?: boolean;
}

// Simplified Firebase DB interface to match original code's usage
export interface FirestoreDB {
  collection: (...path: string[]) => any;
  doc: (...path: string[]) => any;
}
