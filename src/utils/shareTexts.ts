/**
 * Texte der Tourennachricht in der Sprache des Fahrers.
 *
 * Die Nachricht geht per WhatsApp an den Fahrer; mehrere fahren fuer uns, ohne
 * fliessend Deutsch zu sprechen. Uebersetzt werden nur die festen Bausteine —
 * Tourname, Standortnamen und die Notizen zu Be- und Entladung bleiben so, wie
 * sie eingetragen wurden.
 *
 * Zahlen und Uhrzeiten bleiben ebenfalls im gewohnten Format (24 Stunden,
 * Datum tt.mm.jjjj): die Fahrer arbeiten in Deutschland, und ein umgestelltes
 * Datumsformat waere eher Fehlerquelle als Hilfe.
 */

export type DriverLanguage = 'de' | 'uk' | 'ru' | 'pl' | 'en';

export const DRIVER_LANGUAGES: Array<{ code: DriverLanguage; label: string; native: string }> = [
  { code: 'de', label: 'Deutsch', native: 'Deutsch' },
  { code: 'uk', label: 'Ukrainisch', native: 'Українська' },
  { code: 'ru', label: 'Russisch', native: 'Русский' },
  { code: 'pl', label: 'Polnisch', native: 'Polski' },
  { code: 'en', label: 'Englisch', native: 'English' },
];

export function isDriverLanguage(value: unknown): value is DriverLanguage {
  return typeof value === 'string' && DRIVER_LANGUAGES.some((l) => l.code === value);
}

interface Bausteine {
  tour: string;
  datum: string;
  fahrer: string;
  aktualisiert: string;
  /** "noch {rest} von {gesamt} Stops" */
  nochStops: (rest: number, gesamt: number) => string;
  zeitenNeu: string;
  abfahrt: string;
  aktuellesFahrzeug: string;
  fahrt: string;
  pause: string;
  tagesruhe: string;
  weiterfahrtFolgetag: string;
  abHier: string;
  restfahrzeit: string;
  endeCa: string;
  fahrzeit: string;
  lenkzeit: string;
  gesamt: string;
  stop: string;
  /** Kurzform fuer Minuten, z.B. "Min." */
  min: string;
  /** Kurzform fuer Stunden, z.B. "h" */
  std: string;
  /** Minutenanteil hinter der Stunde, z.B. "min" in "2h 30min" */
  stdMin: string;
  /** Steht im Deutschen hinter der Uhrzeit ("17:40 Uhr"), sonst meist leer. */
  uhr: string;
  /** Ueberschrift der Fahrzeugmasse vor dem Link. */
  fahrzeugMasse: string;
  /** "4,00 m hoch" — das Wort hinter dem Mass. */
  hoch: string;
  breit: string;
  lang: string;

  // --- Fahrerseite (/fahrer/<token>) ---
  naechsterStop: string;
  erledigt: string;
  /** "12 Min. hinter Plan" */
  hinterPlan: (min: number) => string;
  /** "8 Min. Puffer" */
  puffer: (min: number) => string;
  imPlan: string;
  voraussichtlich: string;
  ankunft: string;
  standzeit: string;
  aufladen: string;
  abladen: string;
  tourBeendet: string;
  /** "Stand 10:32" — Zeitpunkt der letzten Aktualisierung. */
  stand: string;
  linkAbgelaufen: string;
  linkUngueltig: string;
  nichtAbrufbar: string;
}

const TEXTE: Record<DriverLanguage, Bausteine> = {
  de: {
    tour: 'Tour', datum: 'Datum', fahrer: 'Fahrer',
    aktualisiert: 'Aktualisiert',
    nochStops: (r, g) => `noch ${r} von ${g} Stops`,
    zeitenNeu: 'Zeiten neu berechnet',
    abfahrt: 'Abfahrt', aktuellesFahrzeug: 'aktuelles Fahrzeug',
    fahrt: 'Fahrt', pause: 'Pause',
    tagesruhe: 'TAGESRUHE', weiterfahrtFolgetag: 'Weiterfahrt am Folgetag',
    abHier: 'Ab hier',
    restfahrzeit: 'Restfahrzeit', endeCa: 'Ende ca.',
    fahrzeit: 'Fahrzeit', lenkzeit: 'LKW-Lenkzeit', gesamt: 'Gesamt',
    stop: 'Stop', min: 'Min.', std: 'h', stdMin: 'min', uhr: ' Uhr',
    fahrzeugMasse: 'Fahrzeugmaße',
    hoch: 'hoch', breit: 'breit', lang: 'lang',
    naechsterStop: 'Nächster Stop', erledigt: 'Erledigt',
    hinterPlan: (m) => `${m} Min. hinter Plan`, puffer: (m) => `${m} Min. Puffer`,
    imPlan: 'Im Plan', voraussichtlich: 'voraussichtlich', ankunft: 'Ankunft',
    standzeit: 'Standzeit', aufladen: 'Aufladen', abladen: 'Abladen',
    tourBeendet: 'Tour beendet', stand: 'Stand',
    linkAbgelaufen: 'Dieser Link ist abgelaufen', linkUngueltig: 'Link ungültig',
    nichtAbrufbar: 'Daten gerade nicht abrufbar',
  },
  uk: {
    tour: 'Маршрут', datum: 'Дата', fahrer: 'Водій',
    aktualisiert: 'Оновлено',
    nochStops: (r, g) => `ще ${r} з ${g} зупинок`,
    zeitenNeu: 'Час перераховано',
    abfahrt: 'Виїзд', aktuellesFahrzeug: 'поточний транспорт',
    fahrt: 'їзда', pause: 'Перерва',
    tagesruhe: 'ДЕННИЙ ВІДПОЧИНОК', weiterfahrtFolgetag: 'Продовження наступного дня',
    abHier: 'Далі',
    restfahrzeit: 'Залишок часу в дорозі', endeCa: 'Кінець прибл.',
    fahrzeit: 'Час у дорозі', lenkzeit: 'Час керування вантажівкою', gesamt: 'Разом',
    stop: 'Зупинка', min: 'хв', std: 'год', stdMin: 'хв', uhr: '',
    fahrzeugMasse: 'Габарити транспорту',
    hoch: 'заввишки', breit: 'завширшки', lang: 'завдовжки',
    naechsterStop: 'Наступна зупинка', erledigt: 'Виконано',
    hinterPlan: (m) => `${m} хв відставання`, puffer: (m) => `${m} хв запасу`,
    imPlan: 'За планом', voraussichtlich: 'орієнтовно', ankunft: 'Прибуття',
    standzeit: 'Час на місці', aufladen: 'Завантажити', abladen: 'Розвантажити',
    tourBeendet: 'Маршрут завершено', stand: 'Станом на',
    linkAbgelaufen: 'Це посилання застаріло', linkUngueltig: 'Недійсне посилання',
    nichtAbrufbar: 'Дані зараз недоступні',
  },
  ru: {
    tour: 'Маршрут', datum: 'Дата', fahrer: 'Водитель',
    aktualisiert: 'Обновлено',
    nochStops: (r, g) => `ещё ${r} из ${g} остановок`,
    zeitenNeu: 'Время пересчитано',
    abfahrt: 'Выезд', aktuellesFahrzeug: 'текущий транспорт',
    fahrt: 'езда', pause: 'Перерыв',
    tagesruhe: 'ЕЖЕДНЕВНЫЙ ОТДЫХ', weiterfahrtFolgetag: 'Продолжение на следующий день',
    abHier: 'Далее',
    restfahrzeit: 'Оставшееся время в пути', endeCa: 'Конец прибл.',
    fahrzeit: 'Время в пути', lenkzeit: 'Время управления грузовиком', gesamt: 'Всего',
    stop: 'Остановка', min: 'мин', std: 'ч', stdMin: 'мин', uhr: '',
    fahrzeugMasse: 'Габариты транспорта',
    hoch: 'высота', breit: 'ширина', lang: 'длина',
    naechsterStop: 'Следующая остановка', erledigt: 'Выполнено',
    hinterPlan: (m) => `${m} мин отставания`, puffer: (m) => `${m} мин запаса`,
    imPlan: 'По плану', voraussichtlich: 'ориентировочно', ankunft: 'Прибытие',
    standzeit: 'Время на месте', aufladen: 'Загрузить', abladen: 'Выгрузить',
    tourBeendet: 'Маршрут завершён', stand: 'По состоянию на',
    linkAbgelaufen: 'Эта ссылка устарела', linkUngueltig: 'Недействительная ссылка',
    nichtAbrufbar: 'Данные сейчас недоступны',
  },
  pl: {
    tour: 'Trasa', datum: 'Data', fahrer: 'Kierowca',
    aktualisiert: 'Zaktualizowano',
    nochStops: (r, g) => `jeszcze ${r} z ${g} przystanków`,
    zeitenNeu: 'Czasy przeliczone',
    abfahrt: 'Wyjazd', aktuellesFahrzeug: 'aktualny pojazd',
    fahrt: 'jazda', pause: 'Przerwa',
    tagesruhe: 'ODPOCZYNEK DOBOWY', weiterfahrtFolgetag: 'Dalsza jazda następnego dnia',
    abHier: 'Od tego miejsca',
    restfahrzeit: 'Pozostały czas jazdy', endeCa: 'Koniec ok.',
    fahrzeit: 'Czas jazdy', lenkzeit: 'Czas prowadzenia ciężarówki', gesamt: 'Razem',
    stop: 'Przystanek', min: 'min', std: 'godz', stdMin: 'min', uhr: '',
    fahrzeugMasse: 'Wymiary pojazdu',
    hoch: 'wysokość', breit: 'szerokość', lang: 'długość',
    naechsterStop: 'Następny przystanek', erledigt: 'Zrobione',
    hinterPlan: (m) => `${m} min opóźnienia`, puffer: (m) => `${m} min zapasu`,
    imPlan: 'Zgodnie z planem', voraussichtlich: 'przewidywane', ankunft: 'Przyjazd',
    standzeit: 'Czas postoju', aufladen: 'Załadunek', abladen: 'Rozładunek',
    tourBeendet: 'Trasa zakończona', stand: 'Stan na',
    linkAbgelaufen: 'Ten link wygasł', linkUngueltig: 'Nieprawidłowy link',
    nichtAbrufbar: 'Dane chwilowo niedostępne',
  },
  en: {
    tour: 'Tour', datum: 'Date', fahrer: 'Driver',
    aktualisiert: 'Updated',
    nochStops: (r, g) => `${r} of ${g} stops left`,
    zeitenNeu: 'Times recalculated',
    abfahrt: 'Departure', aktuellesFahrzeug: 'current vehicle',
    fahrt: 'drive', pause: 'Break',
    tagesruhe: 'DAILY REST', weiterfahrtFolgetag: 'Continue next day',
    abHier: 'From here',
    restfahrzeit: 'Remaining drive time', endeCa: 'End approx.',
    fahrzeit: 'Drive time', lenkzeit: 'Truck driving time', gesamt: 'Total',
    stop: 'Stop', min: 'min', std: 'h', stdMin: 'min', uhr: '',
    fahrzeugMasse: 'Vehicle dimensions',
    hoch: 'high', breit: 'wide', lang: 'long',
    naechsterStop: 'Next stop', erledigt: 'Done',
    hinterPlan: (m) => `${m} min behind schedule`, puffer: (m) => `${m} min ahead`,
    imPlan: 'On schedule', voraussichtlich: 'expected', ankunft: 'Arrival',
    standzeit: 'Time on site', aufladen: 'Load', abladen: 'Unload',
    tourBeendet: 'Tour finished', stand: 'As of',
    linkAbgelaufen: 'This link has expired', linkUngueltig: 'Invalid link',
    nichtAbrufbar: 'Data currently unavailable',
  },
};

/** Bausteine einer Sprache; unbekannte Codes fallen auf Deutsch zurueck. */
export function shareTexts(lang: string | null | undefined): Bausteine {
  return isDriverLanguage(lang) ? TEXTE[lang] : TEXTE.de;
}

/**
 * Dauer in der Sprache des Fahrers, z.B. "2h 30min" / "2год 30хв".
 *
 * Bewusst nicht ueber die allgemeine formatDuration: die formatiert fuer die
 * Oberflaeche und bleibt deutsch.
 */
export function formatDurationIn(lang: string | null | undefined, minutes: number | null | undefined): string {
  const t = shareTexts(lang);
  if (minutes == null || minutes < 0) return '--';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} ${t.min}`;
  if (m === 0) return `${h}${t.std}`;
  return `${h}${t.std} ${m}${t.stdMin}`;
}
