import ThemeLightIcon from '../../assets/icons/theme-light.svg?react'
import ThemeDarkIcon from '../../assets/icons/theme-dark.svg?react'

export default function ThemeIcon({ isDark }: { isDark: boolean }) {
  return !isDark ? (
    <ThemeLightIcon className="w-[18px] h-[18px] block" />
  ) : (
    <ThemeDarkIcon className="w-[18px] h-[18px] block" />
  )
}
