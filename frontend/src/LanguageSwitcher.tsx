import { useTranslation } from 'react-i18next'

const LANGS = ['en', 'de', 'fr', 'it'] as const

type Layout = 'inline' | 'stacked'

export function LanguageSwitcher({ layout = 'inline' }: { layout?: Layout }) {
  const { i18n, t } = useTranslation()
  const v = (LANGS as readonly string[]).includes(i18n.resolvedLanguage ?? '')
    ? (i18n.resolvedLanguage as string)
    : 'en'
  return (
    <label className={`lang-switch${layout === 'stacked' ? ' lang-switch--stacked' : ''}`}>
      <span className="lang-switch-label">{t('lang.label')}</span>
      <select
        className="lang-switch-select"
        value={v}
        onChange={e => {
          void i18n.changeLanguage(e.target.value)
        }}
        aria-label={t('lang.label')}
      >
        <option value="en">{t('lang.en')}</option>
        <option value="de">{t('lang.de')}</option>
        <option value="fr">{t('lang.fr')}</option>
        <option value="it">{t('lang.it')}</option>
      </select>
    </label>
  )
}
