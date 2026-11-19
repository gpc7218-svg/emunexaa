import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n'

type Language = 'en' | 'ar'

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
  initializeLanguage: () => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'en',

      initializeLanguage: () => {
        const { language } = get()
        i18n.changeLanguage(language)
        document.documentElement.lang = language
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
      },

      setLanguage: (language: Language) => {
        set({ language })
        i18n.changeLanguage(language)
        document.documentElement.lang = language
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
      },
    }),
    {
      name: 'emunexa-language',
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initializeLanguage()
        }
      },
    }
  )
)