import { useTranslation } from 'react-i18next'
import type { ThemeId } from './theme'
import { useTheme } from './theme'

const THEMES: ThemeId[] = ['dark', 'light', 'darkblue', 'warm', 'midnight', 'slate']

type Layout = 'inline' | 'stacked'

export function ThemeSwitcher({ layout = 'inline' }: { layout?: Layout }) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  return (
    <label className={`theme-switch${layout === 'stacked' ? ' theme-switch--stacked' : ''}`}>
      <span className="theme-switch-label">{t('theme.label')}</span>
      <select
        className="theme-switch-select"
        value={theme}
        onChange={e => setTheme(e.target.value as ThemeId)}
        aria-label={t('theme.label')}
      >
        {THEMES.map(id => (
          <option key={id} value={id}>{t(`theme.${id}`)}</option>
        ))}
      </select>
    </label>
  )
}
