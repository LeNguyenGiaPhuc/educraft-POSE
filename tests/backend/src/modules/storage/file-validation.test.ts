import { describe, it, expect } from 'vitest';
import {
  validateMaterialFile,
  generateStorageKey,
  sanitizeStorageKey,
} from '../../../../../backend/src/modules/storage/file-validation.js';

function createStoredZip(entryNames: string[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const entryName of entryNames) {
    const name = Buffer.from(entryName, 'utf8');
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(name.length, 26);
    localParts.push(localHeader, name);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralParts.push(centralHeader, name);

    localOffset += localHeader.length + name.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(entryNames.length, 8);
  endRecord.writeUInt16LE(entryNames.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(localOffset, 16);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

describe('FileValidation', () => {
  it('generates a safe storage key without path traversal', () => {
    const key = generateStorageKey('../../etc/passwd.pdf');
    expect(key).not.toContain('..');
    expect(key).not.toContain('/');
    expect(key).not.toContain('\\');
    expect(key).not.toContain('passwd');
    expect(key).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(key.endsWith('.pdf')).toBe(true);
  });

  it('rejects path traversal in sanitizeStorageKey', () => {
    expect(() => sanitizeStorageKey('../secret.pdf')).toThrow();
    expect(() => sanitizeStorageKey('/root/secret.pdf')).toThrow();
    expect(() => sanitizeStorageKey('C:\\Windows\\secret.pdf')).toThrow();
  });

  it('accepts valid PDF file with matching signature', () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 test content');
    const result = validateMaterialFile({
      originalname: 'bai_hoc.pdf',
      mimetype: 'application/pdf',
      size: pdfBuffer.length,
      buffer: pdfBuffer,
    });
    expect(result.isValid).toBe(true);
  });

  it('rejects MIME spoofing (e.g. text file disguised as PDF)', () => {
    const fakePdf = Buffer.from('this is plain text not a pdf');
    const result = validateMaterialFile({
      originalname: 'bai_hoc.pdf',
      mimetype: 'application/pdf',
      size: fakePdf.length,
      buffer: fakePdf,
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Định dạng nội dung file không khớp');
  });

  it('rejects file larger than 20MB', () => {
    const result = validateMaterialFile({
      originalname: 'large.pdf',
      mimetype: 'application/pdf',
      size: 21 * 1024 * 1024,
      buffer: Buffer.from('%PDF-1.4'),
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('vượt quá giới hạn tối đa 20MB');
  });

  it('rejects unsupported extensions', () => {
    const result = validateMaterialFile({
      originalname: 'app.exe',
      mimetype: 'application/x-msdownload',
      size: 100,
      buffer: Buffer.from('MZ...'),
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('không được hỗ trợ');
  });

  it('rejects a generic ZIP file renamed to DOCX', () => {
    const genericZip = createStoredZip(['[Content_Types].xml', '_rels/.rels', 'notes.txt']);
    const result = validateMaterialFile({
      originalname: 'fake.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: genericZip.length,
      buffer: genericZip,
    });

    expect(result.isValid).toBe(false);
  });

  it('accepts the matching OOXML document type and rejects the other type', () => {
    const docx = createStoredZip([
      '[Content_Types].xml',
      '_rels/.rels',
      'word/document.xml',
    ]);
    const docxResult = validateMaterialFile({
      originalname: 'lesson.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: docx.length,
      buffer: docx,
    });
    const pptxResult = validateMaterialFile({
      originalname: 'lesson.pptx',
      mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      size: docx.length,
      buffer: docx,
    });

    expect(docxResult.isValid).toBe(true);
    expect(pptxResult.isValid).toBe(false);
  });
});
