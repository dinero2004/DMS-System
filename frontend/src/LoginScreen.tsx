import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './auth/AuthContext'

export function LoginScreen() {
  const { t } = useTranslation()
  const { login, error, clearError } = useAuth()
  const [username, setUsername] = useState('demo')
  const [password, setPassword] = useState('demo')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    setBusy(true)
    try {
      await login(username, password)
    } catch {
      /* error state set in context */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-layout">
      <div className="login-card">
        <h1 className="login-title">{t('app.title')}</h1>
        <p className="login-sub">{t('auth.subtitle')}</p>
        <form className="login-form" onSubmit={onSubmit}>
          <label className="login-field">
            <span>{t('auth.username')}</span>
            <input
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="login-field">
            <span>{t('auth.password')}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={busy}
            />
          </label>
          {error === 'invalid' && <p className="login-error">{t('auth.invalid')}</p>}
          {error === 'network' && <p className="login-error">{t('auth.networkError')}</p>}
          {error === 'server' && <p className="login-error">{t('auth.serverError')}</p>}
          <button type="submit" className="login-submit" disabled={busy}>
            {busy ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
        <p className="login-hint">{t('auth.demoHint')}</p>
      </div>
    </div>
  )
}
