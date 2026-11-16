export const acceptedMaterialTypes = '.pdf,.pptx,.docx,.jpg,.jpeg,.png'
export const maxMaterialBytes = 20 * 1024 * 1024

export const publicationLabels = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã công bố',
  ARCHIVED: 'Đã lưu trữ',
} as const

export const processingLabels = {
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Đang xử lý',
  PROCESSED: 'Đã xử lý',
  FAILED: 'Xử lý thất bại',
} as const

export function isSupportedMaterial(file: File): boolean {
  return /\.(pdf|pptx|docx|jpe?g|png)$/i.test(file.name)
}

export function getMaterialProcessingClass(status: string): string {
  if (status === 'FAILED') return 'failed'
  if (status === 'PENDING' || status === 'PROCESSING') return 'processing'
  return 'processed'
}

export function canPublishMaterials(materials: { processing: string; local?: boolean }[]): boolean {
  return materials.length > 0 && materials.every((material) => material.processing === 'PROCESSED' && !material.local)
}

export function sampleReplacement(processing: 'PROCESSED' | 'PROCESSING' | 'FAILED') {
  return [
    { id: 'fixture-retained', name: 'De-cuong-bai-hoc.pdf', version: 1, processing: 'PROCESSED' as const, sourcePosition: 'Trang 1–4' },
    { id: 'fixture-replacement', name: 'Hoc-lieu-thay-the.pptx', version: 3, processing, sourcePosition: processing === 'PROCESSED' ? 'Slide 1–12' : 'Chưa có nội dung trích xuất' },
  ]
}
