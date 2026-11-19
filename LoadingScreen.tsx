import { useTranslation } from 'react-i18next'

export function LoadingScreen() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-primary">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-3xl">E</span>
          </div>
          <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 animate-ping opacity-75" />
        </div>
        <div className="text-center">
          <h2 className="heading-3 text-text-primary">EmuNexa</h2>
          <p className="body text-text-tertiary mt-1">{t('loading')}</p>
        </div>
        <div className="w-48 h-2 bg-surface-tertiary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full animate-shimmer" style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  )
}