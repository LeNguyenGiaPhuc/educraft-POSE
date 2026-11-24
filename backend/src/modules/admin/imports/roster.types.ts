import { createHash } from 'node:crypto';

export interface StudentImportRow {
  line: number;
  fullName: string;
  username: string;
  contact: string;
  original?: {
    fullName: string;
    username: string;
    contact: string;
  };
}

export type RosterIssueField = 'file' | 'fullName' | 'username' | 'contact';

export interface ImportIssue {
  line: number;
  field: RosterIssueField;
  code: string;
  message: string;
}

export interface NormalizationNotice extends ImportIssue {
  code: 'NORMALIZED';
}

export interface PreviewResult {
  rows: StudentImportRow[];
  issues: ImportIssue[];
  normalizationNotices: NormalizationNotice[];
  isValid: boolean;
  validationToken: string | null;
  totalRows: number;
  validRows: number;
}

export interface ValidationTokenPayload {
  adminId: string;
  operation: 'EXISTING_CLASSROOM' | 'NEW_CLASSROOM';
  classroomId?: string;
  rowCount: number;
  rowsHash: string;
  expiresAt: number;
}

export function hashRosterRows(rows: StudentImportRow[]): string {
  const canonical = rows
    .map((r) => `${r.line}:${r.fullName}:${r.username}:${r.contact}`)
    .join('\n');
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
