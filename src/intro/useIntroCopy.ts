import { useI18n } from '../i18n'
import { introCopy, type IntroCopy } from './copy'

export function useIntroCopy(): IntroCopy {
  const { locale } = useI18n()
  return introCopy(locale)
}
