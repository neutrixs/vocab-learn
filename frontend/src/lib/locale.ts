export interface UILocale {
  /** Language name displayed in native script */
  name: string;

  /** Part-of-speech labels */
  pos: Record<string, string>;

  /** Navigation */
  nav_home: string;
  nav_metin: string;
  nav_settings: string;

  /** Metin (reading texts) */
  metin_title: string;
  metin_subtitle: string;
  metin_today: string;
  metin_archive: string;
  metin_mark_read: string;
  metin_marked_read: string;
  metin_read_badge: string;
  metin_empty: string;
  metin_back: string;
  metin_not_in_vocab: string;
  metin_open: string;
  metin_close: string;
  metin_highlight_show: string;
  metin_highlight_hide: string;

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
  study_settings_title: string;
  max_new_words_label: string;
  words_per_day: string;
  max_new_words_hint: string;
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
  logout: string;
}

const tr: UILocale = {
  name: 'Türkçe',

  pos: {
    verb: 'FİİL',
    noun: 'İSİM',
    adjective: 'SIFAT',
    adverb: 'ZARF',
    pronoun: 'ZAMİR',
    conjunction: 'BAĞLAÇ',
    postposition: 'EDAT',
    interjection: 'ÜNLEM',
    'noun/adjective': 'İSİM/SIFAT',
    phrase: 'İFADE',
  },

  nav_home: 'Ana Sayfa',
  nav_metin: 'Metin',
  nav_settings: 'Ayarlar',

  metin_title: 'Günlük Metin',
  metin_subtitle: 'Bağlam içinde sözcükler',
  metin_today: 'BUGÜNKÜ METİN',
  metin_archive: 'ARŞİV',
  metin_mark_read: 'Okudum ✓',
  metin_marked_read: 'OKUNDU ✓',
  metin_read_badge: 'OKUNDU',
  metin_empty: 'Henüz metin yok.',
  metin_back: '← Geri',
  metin_not_in_vocab: 'Bu kelime sözlükte yok.',
  metin_open: 'Oku',
  metin_close: 'Kapat',
  metin_highlight_show: 'Vurguları Göster',
  metin_highlight_hide: 'Vurguları Gizle',

  home_title: 'Sözcük Öğren',
  home_subtitle: 'Türkçe',
  progress_title: 'İLERLEME',
  stat_streak: 'Gün serisi',
  stat_reviews: 'Toplam tekrar',
  stat_accuracy: 'Doğruluk',
  mastery: 'Ustalık',
  session_title: 'BUGÜNKÜ OTURUM',
  loading: 'Yükleniyor…',
  all_done: 'Harika! Bugün tüm kartları tamamladınız.',
  review_count: (n) => `${n} TEKRAR`,
  new_count: (n) => `${n} YENİ`,
  cards_waiting: (n) => `${n} kart bekliyor`,
  btn_recognition: 'Kelime Tanıma',
  btn_recall: 'Aktif Hatırlama',
  btn_mixed: 'Karma Çalışma',
  word_list_title: (total) => `SÖZCÜK LİSTESİ (${total})`,
  search_placeholder: 'Ara…',
  no_results: 'Sonuç bulunamadı.',

  mode_recognition: 'TANIMA',
  mode_recall: 'AKTİF HATIRLAMA',
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
  study_settings_title: 'ÇALIŞMA',
  max_new_words_label: 'Günlük yeni kelime',
  words_per_day: 'kelime / gün',
  max_new_words_hint: 'Her gün kaç yeni kelime öğrenileceğini belirler. Tekrarlar etkilenmez.',
  language_title: 'DİL',
  active_lang: 'Aktif dil',
  reset_title: 'İLERLEMEYİ SIFIRLA',
  reset_warning: 'Bu işlem geri alınamaz. Tüm SM-2 kart verileri silinir.',
  reset_lang: (code) => `${code.toUpperCase()} verisini sıfırla`,
  reset_all: 'Tüm ilerlemeyi sıfırla',
  confirm_prompt: 'Emin misiniz? (Tekrar tıklayın)',
  cancel: 'İptal',
  about_title: 'HAKKINDA',
  about_text: 'Sözcük Öğren — Aralıklı tekrar (SM-2) ile yabancı dil kelime öğrenme uygulaması.',
  data_local: 'Veriler yalnızca tarayıcınızda saklanır.',
  logout: 'Çıkış Yap',
};

const en: UILocale = {
  name: 'English',

  pos: {
    verb: 'VERB',
    noun: 'NOUN',
    adjective: 'ADJECTIVE',
    adverb: 'ADVERB',
    pronoun: 'PRONOUN',
    conjunction: 'CONJUNCTION',
    postposition: 'POSTPOSITION',
    interjection: 'INTERJECTION',
    'noun/adjective': 'NOUN/ADJECTIVE',
    phrase: 'PHRASE',
  },

  nav_home: 'Home',
  nav_metin: 'Reading',
  nav_settings: 'Settings',

  metin_title: 'Daily Reading',
  metin_subtitle: 'Vocabulary in context',
  metin_today: "TODAY'S READING",
  metin_archive: 'ARCHIVE',
  metin_mark_read: 'Mark as read ✓',
  metin_marked_read: 'READ ✓',
  metin_read_badge: 'READ',
  metin_empty: 'No texts yet.',
  metin_back: '← Back',
  metin_not_in_vocab: 'Not in vocabulary.',
  metin_open: 'Read',
  metin_close: 'Close',
  metin_highlight_show: 'Show highlights',
  metin_highlight_hide: 'Hide highlights',

  home_title: 'Sözcük Learn',
  home_subtitle: 'English',
  progress_title: 'PROGRESS',
  stat_streak: 'Day streak',
  stat_reviews: 'Total reviews',
  stat_accuracy: 'Accuracy',
  mastery: 'Mastery',
  session_title: "TODAY'S SESSION",
  loading: 'Loading…',
  all_done: 'Great! You completed all cards for today.',
  review_count: (n) => `${n} REVIEW`,
  new_count: (n) => `${n} NEW`,
  cards_waiting: (n) => `${n} cards waiting`,
  btn_recognition: 'Word Recognition',
  btn_recall: 'Active Recall',
  btn_mixed: 'Mixed Study',
  word_list_title: (total) => `WORD LIST (${total})`,
  search_placeholder: 'Search…',
  no_results: 'No results found.',

  mode_recognition: 'RECOGNITION',
  mode_recall: 'ACTIVE RECALL',
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
  study_settings_title: 'STUDY',
  max_new_words_label: 'New words per day',
  words_per_day: 'words / day',
  max_new_words_hint: 'Controls how many new words are introduced each day. Reviews are not affected.',
  language_title: 'LANGUAGE',
  active_lang: 'Active language',
  reset_title: 'RESET PROGRESS',
  reset_warning: 'This cannot be undone. All SM-2 card data will be deleted.',
  reset_lang: (code) => `Reset ${code.toUpperCase()} data`,
  reset_all: 'Reset all progress',
  confirm_prompt: 'Are you sure? (Click again)',
  cancel: 'Cancel',
  about_title: 'ABOUT',
  about_text: 'Sözcük Learn — A spaced-repetition (SM-2) vocabulary learning app.',
  data_local: 'Data is stored locally in your browser only.',
  logout: 'Log out',
};

const locales: Record<string, UILocale> = { tr, en };

export function getLocale(lang: string): UILocale {
  return locales[lang] ?? en;
}
