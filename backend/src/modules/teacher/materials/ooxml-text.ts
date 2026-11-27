import { inflateRawSync } from 'node:zlib';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const MAX_ENTRY_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 500_000;

type ZipEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

function findEndRecord(buffer: Buffer): number {
  const minimumSize = 22;
  const firstPossibleOffset = Math.max(0, buffer.length - minimumSize - 65_535);
  for (let offset = buffer.length - minimumSize; offset >= firstPossibleOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function readZipEntries(buffer: Buffer): ZipEntry[] {
  const endRecordOffset = findEndRecord(buffer);
  if (endRecordOffset < 0) throw new Error('Invalid OOXML archive');

  const entryCount = buffer.readUInt16LE(endRecordOffset + 10);
  const directorySize = buffer.readUInt32LE(endRecordOffset + 12);
  const directoryOffset = buffer.readUInt32LE(endRecordOffset + 16);
  const directoryEnd = directoryOffset + directorySize;
  if (directoryEnd > endRecordOffset) throw new Error('Invalid OOXML directory');

  const entries: ZipEntry[] = [];
  let cursor = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > directoryEnd || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error('Invalid OOXML entry');
    }
    const flags = buffer.readUInt16LE(cursor + 8);
    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const nameStart = cursor + 46;
    const nextEntry = nameStart + nameLength + extraLength + commentLength;
    if ((flags & 0x1) !== 0 || nextEntry > directoryEnd) throw new Error('Unsupported OOXML entry');

    entries.push({
      name: buffer.toString('utf8', nameStart, nameStart + nameLength),
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });
    cursor = nextEntry;
  }
  return entries;
}

function readEntry(buffer: Buffer, entry: ZipEntry): string {
  if (entry.uncompressedSize > MAX_ENTRY_BYTES || entry.compressedSize > MAX_ENTRY_BYTES) {
    throw new Error('OOXML entry is too large');
  }
  const offset = entry.localHeaderOffset;
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error('Invalid OOXML local entry');
  }
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > buffer.length) throw new Error('Truncated OOXML entry');

  const compressed = buffer.subarray(dataStart, dataEnd);
  const data = entry.compressionMethod === 0
    ? compressed
    : entry.compressionMethod === 8
      ? inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY_BYTES })
      : (() => { throw new Error('Unsupported OOXML compression'); })();
  return data.toString('utf8');
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function xmlToText(xml: string): string {
  const text = xml
    .replace(/<w:tab\b[^>]*\/>/gi, '\t')
    .replace(/<w:(?:br|cr)\b[^>]*\/>/gi, '\n')
    .replace(/<a:br\b[^>]*\/>/gi, '\n')
    .replace(/<\/(?:w:p|a:p)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeXmlEntities(text)
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractOoxmlText(buffer: Buffer, mimeType: string): string | null {
  if (mimeType !== DOCX_MIME && mimeType !== PPTX_MIME) return null;

  const entries = readZipEntries(buffer);
  const selected = mimeType === DOCX_MIME
    ? entries.filter((entry) => entry.name === 'word/document.xml')
    : entries
      .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.name))
      .sort((left, right) => {
        const leftIndex = Number(left.name.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
        const rightIndex = Number(right.name.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
        return leftIndex - rightIndex;
      });

  if (selected.length === 0) throw new Error('OOXML content is missing');
  const text = selected.map((entry) => xmlToText(readEntry(buffer, entry))).filter(Boolean).join('\n\n');
  if (!text) throw new Error('OOXML content is empty');
  return text.slice(0, MAX_TEXT_CHARS);
}
