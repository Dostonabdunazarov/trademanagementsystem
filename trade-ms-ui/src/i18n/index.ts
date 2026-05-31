import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { ru } from './locales/ru'
import { uz } from './locales/uz'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ru, uz },
    fallbackLng: 'ru',
    lng: localStorage.getItem('language') ?? 'ru',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage'], lookupLocalStorage: 'language' },
  })

export default i18n
