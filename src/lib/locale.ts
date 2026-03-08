export interface UILocale {
  /** Language name displayed in native script */
  name: string;

  /** Part-of-speech labels */
  pos: Record<string, string>;

  /** Navigation */
  nav_home: string;
  nav_settings: string;

  /** Home page */
  home_title: string;
  home_subtitle: string;
  progress_title: string;
  stat_streak: string;
  stat_reviews: string;
  stat_accuracy: string;
  mastery: string;
  session_title: string;
  loading: string;
  all_done: string;
  review_count: (n: number) => string;
  new_count: (n: number) => string;
  cards_waiting: (n: number) => string;
  btn_recognition: string;
  btn_recall: string;
  btn_mixed: string;
  word_list_title: (total: number) => string;
  search_placeholder: string;
  no_results: string;

  /** Study page */
  mode_recognition: string;
  mode_recall: string;
  session_complete: string;
  stat_correct: string;
  stat_wrong: string;
  btn_home: string;

  /** Recognition card */
  know_it: string;
  reveal: string;
  didnt_know: string;
  continue_hint: string;

  /** Recall card */
  correct_btn: string;
  wrong_btn: string;
  correct_answer_label: string;
  answer_placeholder: string;
  submit: string;
  hint_esc: string;

  /** Settings */
  settings_title: string;
  settings_subtitle: string;
  language_title: string;
  active_lang: string;
  reset_title: string;
  reset_warning: string;
  reset_lang: (code: string) => string;
  reset_all: string;
  confirm_prompt: string;
  cancel: string;
  about_title: string;
  about_text: string;
  data_local: string;
}

const tr: UILocale = {
  name: 'Türkçe',

  pos: {
    verb: 'Fiil',
    noun: 'İsim',
    adjective: 'Sıfat',
    adverb: 'Zarf',
    pronoun: 'Zamir',
    conjunction: 'Bağlaç',
    postposition: 'Edat',
    interjection: 'Ünlem',
  },

  nav_home: 'Ana Sayfa',
  nav_settings: 'Ayarlar',

  home_title: 'Sözcük Öğren',
  home_subtitle: 'Türkçe',
  progress_title: 'İlerleme',
  stat_streak: 'Gün serisi',
  stat_reviews: 'Toplam tekrar',
  stat_accuracy: 'Doğruluk',
  mastery: 'Ustalık',
  session_title: 'Bugünkü Oturum',
  loading: 'Yükleniyor…',
  all_done: 'Harika! Bugün tüm kartları tamamladınız.',
  review_count: (n) => `${n} tekrar`,
  new_count: (n) => `${n} yeni`,
  cards_waiting: (n) => `${n} kart bekliyor`,
  btn_recognition: 'Kelime Tanıma',
  btn_recall: 'Aktif Hatırlama',
  btn_mixed: 'Karma Çalışma',
  word_list_title: (total) => `Sözcük Listesi (${total})`,
  search_placeholder: 'Ara…',
  no_results: 'Sonuç bulunamadı.',

  mode_recognition: 'Tanıma',
  mode_recall: 'Aktif Hatırlama',
  session_complete: 'Oturum Tamamlandı!',
  stat_correct: 'Doğru',
  stat_wrong: 'Yanlış',
  btn_home: 'Ana Sayfaya Dön',

  know_it: 'Biliyorum ✓ (Enter)',
  reveal: 'Göster (Space)',
  didnt_know: 'Bilmiyordum (Enter / Space)',
  continue_hint: 'Enter veya Space → devam',

  correct_btn: 'Doğru ✓ (Enter)',
  wrong_btn: 'Yanlış ✗ (Enter)',
  correct_answer_label: 'Doğru cevap: ',
  answer_placeholder: 'Cevabınızı yazın…',
  submit: 'Gönder',
  hint_esc: 'İpucu (Esc)',

  settings_title: 'Ayarlar',
  settings_subtitle: 'Tercihler ve sıfırlama',
  language_title: 'Dil',
  active_lang: 'Aktif dil',
  reset_title: 'İlerlemeyi Sıfırla',
  reset_warning: 'Bu işlem geri alınamaz. Tüm SM-2 kart verileri silinir.',
  reset_lang: (code) => `${code.toUpperCase()} verisini sıfırla`,
  reset_all: 'Tüm ilerlemeyi sıfırla',
  confirm_prompt: 'Emin misiniz? (Tekrar tıklayın)',
  cancel: 'İptal',
  about_title: 'Hakkında',
  about_text: 'Sözcük Öğren — Aralıklı tekrar (SM-2) ile yabancı dil kelime öğrenme uygulaması.',
  data_local: 'Veriler yalnızca tarayıcınızda saklanır.',
};

const en: UILocale = {
  name: 'English',

  pos: {
    verb: 'Verb',
    noun: 'Noun',
    adjective: 'Adjective',
    adverb: 'Adverb',
    pronoun: 'Pronoun',
    conjunction: 'Conjunction',
    postposition: 'Postposition',
    interjection: 'Interjection',
  },

  nav_home: 'Home',
  nav_settings: 'Settings',

  home_title: 'Sözcük Learn',
  home_subtitle: 'English',
  progress_title: 'Progress',
  stat_streak: 'Day streak',
  stat_reviews: 'Total reviews',
  stat_accuracy: 'Accuracy',
  mastery: 'Mastery',
  session_title: "Today's Session",
  loading: 'Loading…',
  all_done: 'Great! You completed all cards for today.',
  review_count: (n) => `${n} review`,
  new_count: (n) => `${n} new`,
  cards_waiting: (n) => `${n} cards waiting`,
  btn_recognition: 'Word Recognition',
  btn_recall: 'Active Recall',
  btn_mixed: 'Mixed Study',
  word_list_title: (total) => `Word List (${total})`,
  search_placeholder: 'Search…',
  no_results: 'No results found.',

  mode_recognition: 'Recognition',
  mode_recall: 'Active Recall',
  session_complete: 'Session Complete!',
  stat_correct: 'Correct',
  stat_wrong: 'Wrong',
  btn_home: 'Back to Home',

  know_it: 'I know it ✓ (Enter)',
  reveal: 'Reveal (Space)',
  didnt_know: "Didn't know (Enter / Space)",
  continue_hint: 'Enter or Space → continue',

  correct_btn: 'Correct ✓ (Enter)',
  wrong_btn: 'Wrong ✗ (Enter)',
  correct_answer_label: 'Correct answer: ',
  answer_placeholder: 'Type your answer…',
  submit: 'Submit',
  hint_esc: 'Hint (Esc)',

  settings_title: 'Settings',
  settings_subtitle: 'Preferences and reset',
  language_title: 'Language',
  active_lang: 'Active language',
  reset_title: 'Reset Progress',
  reset_warning: 'This cannot be undone. All SM-2 card data will be deleted.',
  reset_lang: (code) => `Reset ${code.toUpperCase()} data`,
  reset_all: 'Reset all progress',
  confirm_prompt: 'Are you sure? (Click again)',
  cancel: 'Cancel',
  about_title: 'About',
  about_text: 'Sözcük Learn — A spaced-repetition (SM-2) vocabulary learning app.',
  data_local: 'Data is stored locally in your browser only.',
};

const locales: Record<string, UILocale> = { tr, en };

export function getLocale(lang: string): UILocale {
  return locales[lang] ?? en;
}
