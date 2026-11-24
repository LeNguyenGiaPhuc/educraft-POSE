export function normalizeAcademicYear(value: string): string | null {
  const match = value.trim().replace('–', '-').match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    return null;
  }

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (endYear !== startYear + 1) {
    return null;
  }

  return `${match[1]}-${match[2]}`;
}
