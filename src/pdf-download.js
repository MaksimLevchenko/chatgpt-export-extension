'use strict';

function pdfUiText() {
  const language = preferredUiLanguage();
  if (language.startsWith('ru')) {
    return {
      lang: 'ru',
      print: 'Печать',
      close: 'Закрыть',
      preparing: 'Подготовка PDF...'
    };
  }
  return {
    lang: 'en',
    print: 'Print',
    close: 'Close',
    preparing: 'Preparing PDF...'
  };
}

function preferredUiLanguage() {
  const values = [];
  if (Array.isArray(navigator.languages)) values.push(...navigator.languages);
  if (navigator.language) values.push(navigator.language);
  if (document.documentElement && document.documentElement.lang) values.push(document.documentElement.lang);
  return String(values.find(Boolean) || 'en').toLowerCase();
}
