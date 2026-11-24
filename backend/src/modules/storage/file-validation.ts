import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestError } from '../../shared/errors/app-error.js';

export const MAX_MATERIAL_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const ALLOWED_MATERIAL_MIME_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

export function sanitizeStorageKey(key: string): string {
  if (!key || typeof key !== 'string') {
    throw new BadRequestError('Mã lưu trữ file không hợp lệ');
  }

  if (
    key.includes('..') ||
    key.includes('/') ||
    key.includes('\\') ||
    /^[A-Za-z]:/.test(key)
  ) {
    throw new BadRequestError('Phát hiện đường dẫn không an toàn (path traversal)');
  }

  return path.basename(key);
}

export function generateStorageKey(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const uuid = randomUUID();
  return `${uuid}${ext}`;
}

function readZipEntryNames(buffer: Buffer): Set<string> | null {
  const endRecordSize = 22;
  const maximumCommentSize = 65_535;
  const firstPossibleOffset = Math.max(0, buffer.length - endRecordSize - maximumCommentSize);
  let endRecordOffset = -1;

  for (let offset = buffer.length - endRecordSize; offset >= firstPossibleOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      endRecordOffset = offset;
      break;
    }
  }

  if (endRecordOffset < 0) {
    return null;
  }

  const entryCount = buffer.readUInt16LE(endRecordOffset + 10);
  const directorySize = buffer.readUInt32LE(endRecordOffset + 12);
  const directoryOffset = buffer.readUInt32LE(endRecordOffset + 16);
  const directoryEnd = directoryOffset + directorySize;

  if (directoryEnd > endRecordOffset || directoryOffset < 0) {
    return null;
  }

  const entryNames = new Set<string>();
  let cursor = directoryOffset;

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (cursor + 46 > directoryEnd || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      return null;
    }

    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const nameStart = cursor + 46;
    const nextEntry = nameStart + nameLength + extraLength + commentLength;

    if (nextEntry > directoryEnd) {
      return null;
    }

    entryNames.add(buffer.toString('utf8', nameStart, nameStart + nameLength));
    cursor = nextEntry;
  }

  return cursor === directoryEnd ? entryNames : null;
}

function hasRequiredOoxmlEntries(buffer: Buffer, mimeType: string): boolean {
  const entryNames = readZipEntryNames(buffer);
  if (!entryNames) {
    return false;
  }

  if (!entryNames.has('[Content_Types].xml') || !entryNames.has('_rels/.rels')) {
    return false;
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return entryNames.has('word/document.xml');
  }

  return entryNames.has('ppt/presentation.xml');
}

export function checkFileSignature(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (mimeType === 'application/pdf') {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  // PNG: \x89PNG (0x89 0x50 0x4E 0x47)
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // DOCX and PPTX are ZIP containers with different required OOXML entries.
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    const hasZipHeader =
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04;
    return hasZipHeader && hasRequiredOoxmlEntries(buffer, mimeType);
  }

  return true;
}

export function validateMaterialFile(file: {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
}): { isValid: boolean; error?: string } {
  // 1. File size limit
  if (file.size > MAX_MATERIAL_FILE_SIZE) {
    return {
      isValid: false,
      error: `Kích thước file vượt quá giới hạn tối đa 20MB (${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
    };
  }

  // 2. MIME type & extension check
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ALLOWED_MATERIAL_MIME_TYPES[file.mimetype];

  if (!allowedExtensions?.includes(ext)) {
    return {
      isValid: false,
      error: 'Định dạng file không được hỗ trợ. Hệ thống chỉ chấp nhận PDF, PPTX, DOCX, PNG, JPG.',
    };
  }

  // 3. File magic bytes / signature check
  if (file.buffer && !checkFileSignature(file.buffer, file.mimetype)) {
    return {
      isValid: false,
      error: 'Định dạng nội dung file không khớp với phần mở rộng (phát hiện giả mạo MIME type).',
    };
  }

  return { isValid: true };
}
