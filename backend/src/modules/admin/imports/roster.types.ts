import { createHash } from 'node:crypto';

export interface StudentImportRow {
  line: number;
  fullName: string;
  username: string;
  contact: string;
}

export interface ImportIssue {
  line: number;
  message: string;
}

export interface PreviewResult {
  rows: StudentImportRow[];
  issues: ImportIssue[];
  isValid: boolean;
  validationToken: string | null;
  totalRows: number;
  validRows: number;
}

export interface ValidationTokenPayload {
  adminId: string;
  classroomId: string;
  rowCount: number;
  rowsHash: string;
  expiresAt: number;
}

export function hashRosterRows(rows: StudentImportRow[]): string {
  const canonical = rows
    .map((r) => `${r.line}:${r.fullName.trim()}:${r.username.trim()}:${r.contact.trim()}`)
    .join('\n');
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
