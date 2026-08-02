import { readFileAsBase64 } from '@/lib/booking-branding';
import type { SupportAttachmentUpload } from '@/types/api';

export const SUPPORT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const SUPPORT_ATTACHMENT_MAX_COUNT = 5;

export const SUPPORT_ATTACHMENT_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const EXT_TO_TYPE: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function isImageContentType(contentType: string): boolean {
  return contentType.startsWith('image/');
}

export function resolveSupportContentType(file: File): string | null {
  if (ALLOWED_TYPES.has(file.type)) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_TYPE[ext] ?? null;
}

export async function fileToSupportAttachmentUpload(file: File): Promise<SupportAttachmentUpload> {
  const contentType = resolveSupportContentType(file);
  if (!contentType) {
    throw new Error(`Unsupported file type: ${file.name}`);
  }
  if (file.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
    throw new Error(`${file.name} must be 5 MB or smaller`);
  }
  const dataBase64 = await readFileAsBase64(file);
  return {
    fileName: file.name,
    contentType,
    dataBase64,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
