import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './auth/AuthContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'

export function SettingsMenu() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  return (
    <div className="settings-menu-root" ref={rootRef}>
      <button
        type="button"
        className="settings-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(o => !o)}
      >
        <span className="settings-trigger-icon" aria-hidden>⚙</span>
        <span className="settings-trigger-text">{t('settings.button')}</span>
      </button>
      {open && (
        <div className="settings-panel" role="dialog" aria-label={t('settings.title')}>
          <h3 className="settings-panel-title">{t('settings.title')}</h3>
          <p className="settings-user">
            {t('settings.signedInAs')} <strong>{user}</strong>
          </p>
          <div className="settings-fields">
            <ThemeSwitcher layout="stacked" />
            <LanguageSwitcher layout="stacked" />
          </div>
          <button type="button" className="settings-logout" onClick={() => { void logout(); setOpen(false) }}>
            {t('auth.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}
