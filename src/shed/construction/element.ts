import { defaultElement, type ArchitecturalElement, type AttachmentType } from '../model'
import type { CatalogEntry } from './catalog'

export function elementFromCatalog(
  entry: CatalogEntry,
  id: string,
  link: { parentId: string | null; attachmentType: AttachmentType | null },
): ArchitecturalElement {
  const base = defaultElement(entry.type, id)
  return {
    ...base,
    variant: entry.variant,
    ornament: entry.ornament ?? base.ornament,
    width: entry.width ?? base.width,
    height: entry.height ?? base.height,
    roof: entry.roof ?? base.roof,
    catalogId: entry.id,
    role: entry.role,
    parentId: link.parentId,
    attachmentType: link.attachmentType,
    attachmentAnchor: link.attachmentType,
  }
}
