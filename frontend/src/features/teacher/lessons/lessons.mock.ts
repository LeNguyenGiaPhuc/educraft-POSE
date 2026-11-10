export const publicationLabels = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', ARCHIVED: 'Đã lưu trữ' } as const
export const processingLabels = { PROCESSED: 'Đã xử lý', PROCESSING: 'Đang xử lý', FAILED: 'Xử lý thất bại' } as const
export const acceptedMaterialTypes = '.pdf,.pptx,.docx,.jpg,.jpeg,.png'
export const maxMaterialBytes = 20 * 1024 * 1024

export function isSupportedMaterial(file: File): boolean {
  return /\.(pdf|pptx|docx|jpe?g|png)$/i.test(file.name)
}
