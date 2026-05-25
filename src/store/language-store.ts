import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { debugAction } from '@/lib/debug';

export type Language = 'id' | 'en';

type LanguageState = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const applyDocumentLanguage = (language: Language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language === 'id' ? 'id' : 'en';
  }
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'id',
      setLanguage: (language) => {
        applyDocumentLanguage(language);
        debugAction('language', 'language set', { language });
        set({ language });
      },
    }),
    {
      name: 'documind-language',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyDocumentLanguage(state.language);
          debugAction('language', 'language rehydrated', { language: state.language });
        }
      },
    }
  )
);
