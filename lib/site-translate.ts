export const PAGE_SOURCE_LANGUAGE = 'en';

export type SiteLanguage = {
  code: string;
  name: string;
  nativeName: string;
};

export type CountryLanguageGroup = {
  country: string;
  iso2: string;
  languageCodes: string[];
};

/** Google Translate language codes with English and native labels. */
export const SITE_LANGUAGES: SiteLanguage[] = [
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano' },
  { code: 'ny', name: 'Chichewa', nativeName: 'Chichewa' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'co', name: 'Corsican', nativeName: 'Corsu' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'fy', name: 'Frisian', nativeName: 'Frysk' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
  { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'hmn', name: 'Hmong', nativeName: 'Hmong' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'jw', name: 'Javanese', nativeName: 'Basa Jawa' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
  { code: 'la', name: 'Latin', nativeName: 'Latina' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti' },
  { code: 'mi', name: 'Maori', nativeName: 'Te Reo Māori' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол' },
  { code: 'my', name: 'Myanmar (Burmese)', nativeName: 'မြန်မာ' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Samoa' },
  { code: 'gd', name: 'Scots Gaelic', nativeName: 'Gàidhlig' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'st', name: 'Sesotho', nativeName: 'Sesotho' },
  { code: 'sn', name: 'Shona', nativeName: 'ChiShona' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'tt', name: 'Tatar', nativeName: 'Татар' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmen' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa' },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu' },
];

const LANGUAGE_BY_CODE = new Map(SITE_LANGUAGES.map((lang) => [lang.code, lang]));

/** Safari source markets and global countries mapped to common guest languages. */
export const COUNTRY_LANGUAGE_GROUPS: CountryLanguageGroup[] = [
  { country: 'Uganda', iso2: 'ug', languageCodes: ['en', 'sw', 'fr'] },
  { country: 'Kenya', iso2: 'ke', languageCodes: ['en', 'sw'] },
  { country: 'Tanzania', iso2: 'tz', languageCodes: ['sw', 'en'] },
  { country: 'Rwanda', iso2: 'rw', languageCodes: ['rw', 'en', 'fr'] },
  { country: 'South Africa', iso2: 'za', languageCodes: ['en', 'af', 'zu', 'xh'] },
  { country: 'Botswana', iso2: 'bw', languageCodes: ['en', 'af'] },
  { country: 'Namibia', iso2: 'na', languageCodes: ['en', 'af', 'de'] },
  { country: 'Zambia', iso2: 'zm', languageCodes: ['en'] },
  { country: 'Zimbabwe', iso2: 'zw', languageCodes: ['en', 'sn'] },
  { country: 'Malawi', iso2: 'mw', languageCodes: ['en', 'ny'] },
  { country: 'Mozambique', iso2: 'mz', languageCodes: ['pt'] },
  { country: 'Ethiopia', iso2: 'et', languageCodes: ['am', 'en'] },
  { country: 'Egypt', iso2: 'eg', languageCodes: ['ar', 'en', 'fr'] },
  { country: 'Morocco', iso2: 'ma', languageCodes: ['ar', 'fr', 'en'] },
  { country: 'DR Congo', iso2: 'cd', languageCodes: ['fr', 'sw'] },
  { country: 'Madagascar', iso2: 'mg', languageCodes: ['mg', 'fr'] },
  { country: 'Seychelles', iso2: 'sc', languageCodes: ['en', 'fr'] },
  { country: 'United States', iso2: 'us', languageCodes: ['en', 'es'] },
  { country: 'United Kingdom', iso2: 'gb', languageCodes: ['en'] },
  { country: 'Canada', iso2: 'ca', languageCodes: ['en', 'fr'] },
  { country: 'Australia', iso2: 'au', languageCodes: ['en'] },
  { country: 'Germany', iso2: 'de', languageCodes: ['de', 'en'] },
  { country: 'France', iso2: 'fr', languageCodes: ['fr', 'en'] },
  { country: 'Italy', iso2: 'it', languageCodes: ['it', 'en'] },
  { country: 'Spain', iso2: 'es', languageCodes: ['es', 'en'] },
  { country: 'Netherlands', iso2: 'nl', languageCodes: ['nl', 'en'] },
  { country: 'Belgium', iso2: 'be', languageCodes: ['nl', 'fr', 'de', 'en'] },
  { country: 'Switzerland', iso2: 'ch', languageCodes: ['de', 'fr', 'it', 'en'] },
  { country: 'Austria', iso2: 'at', languageCodes: ['de', 'en'] },
  { country: 'Sweden', iso2: 'se', languageCodes: ['sv', 'en'] },
  { country: 'Norway', iso2: 'no', languageCodes: ['no', 'en'] },
  { country: 'Denmark', iso2: 'dk', languageCodes: ['da', 'en'] },
  { country: 'Finland', iso2: 'fi', languageCodes: ['fi', 'sv', 'en'] },
  { country: 'Poland', iso2: 'pl', languageCodes: ['pl', 'en'] },
  { country: 'Czech Republic', iso2: 'cz', languageCodes: ['cs', 'en'] },
  { country: 'Portugal', iso2: 'pt', languageCodes: ['pt', 'en'] },
  { country: 'Brazil', iso2: 'br', languageCodes: ['pt', 'en'] },
  { country: 'Mexico', iso2: 'mx', languageCodes: ['es', 'en'] },
  { country: 'Argentina', iso2: 'ar', languageCodes: ['es', 'en'] },
  { country: 'India', iso2: 'in', languageCodes: ['hi', 'en', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur'] },
  { country: 'China', iso2: 'cn', languageCodes: ['zh-CN', 'en'] },
  { country: 'Japan', iso2: 'jp', languageCodes: ['ja', 'en'] },
  { country: 'South Korea', iso2: 'kr', languageCodes: ['ko', 'en'] },
  { country: 'Singapore', iso2: 'sg', languageCodes: ['en', 'zh-CN', 'ms', 'ta'] },
  { country: 'Malaysia', iso2: 'my', languageCodes: ['ms', 'en', 'zh-CN'] },
  { country: 'Indonesia', iso2: 'id', languageCodes: ['id', 'en'] },
  { country: 'Thailand', iso2: 'th', languageCodes: ['th', 'en'] },
  { country: 'Vietnam', iso2: 'vn', languageCodes: ['vi', 'en'] },
  { country: 'Philippines', iso2: 'ph', languageCodes: ['en', 'ceb'] },
  { country: 'United Arab Emirates', iso2: 'ae', languageCodes: ['ar', 'en', 'hi', 'ur'] },
  { country: 'Saudi Arabia', iso2: 'sa', languageCodes: ['ar', 'en'] },
  { country: 'Israel', iso2: 'il', languageCodes: ['he', 'en', 'ar'] },
  { country: 'Turkey', iso2: 'tr', languageCodes: ['tr', 'en'] },
  { country: 'Russia', iso2: 'ru', languageCodes: ['ru', 'en'] },
  { country: 'Ukraine', iso2: 'ua', languageCodes: ['uk', 'ru', 'en'] },
  { country: 'Ireland', iso2: 'ie', languageCodes: ['en', 'ga'] },
  { country: 'New Zealand', iso2: 'nz', languageCodes: ['en', 'mi'] },
  { country: 'Nigeria', iso2: 'ng', languageCodes: ['en', 'ha', 'ig', 'yo'] },
  { country: 'Ghana', iso2: 'gh', languageCodes: ['en'] },
  { country: 'Pakistan', iso2: 'pk', languageCodes: ['ur', 'en'] },
  { country: 'Bangladesh', iso2: 'bd', languageCodes: ['bn', 'en'] },
  { country: 'Sri Lanka', iso2: 'lk', languageCodes: ['si', 'ta', 'en'] },
  { country: 'Nepal', iso2: 'np', languageCodes: ['ne', 'en'] },
  { country: 'Iran', iso2: 'ir', languageCodes: ['fa', 'en'] },
  { country: 'Iraq', iso2: 'iq', languageCodes: ['ar', 'ku', 'en'] },
  { country: 'Afghanistan', iso2: 'af', languageCodes: ['ps', 'fa', 'en'] },
  { country: 'Greece', iso2: 'gr', languageCodes: ['el', 'en'] },
  { country: 'Hungary', iso2: 'hu', languageCodes: ['hu', 'en'] },
  { country: 'Romania', iso2: 'ro', languageCodes: ['ro', 'en'] },
  { country: 'Croatia', iso2: 'hr', languageCodes: ['hr', 'en'] },
  { country: 'Serbia', iso2: 'rs', languageCodes: ['sr', 'en'] },
  { country: 'Bulgaria', iso2: 'bg', languageCodes: ['bg', 'en'] },
  { country: 'Slovakia', iso2: 'sk', languageCodes: ['sk', 'en'] },
  { country: 'Slovenia', iso2: 'si', languageCodes: ['sl', 'en'] },
  { country: 'Estonia', iso2: 'ee', languageCodes: ['et', 'en'] },
  { country: 'Latvia', iso2: 'lv', languageCodes: ['lv', 'en'] },
  { country: 'Lithuania', iso2: 'lt', languageCodes: ['lt', 'en'] },
  { country: 'Iceland', iso2: 'is', languageCodes: ['is', 'en'] },
  { country: 'Luxembourg', iso2: 'lu', languageCodes: ['fr', 'de', 'lb', 'en'] },
  { country: 'Monaco', iso2: 'mc', languageCodes: ['fr', 'en'] },
  { country: 'Qatar', iso2: 'qa', languageCodes: ['ar', 'en'] },
  { country: 'Kuwait', iso2: 'kw', languageCodes: ['ar', 'en'] },
  { country: 'Oman', iso2: 'om', languageCodes: ['ar', 'en'] },
  { country: 'Bahrain', iso2: 'bh', languageCodes: ['ar', 'en'] },
  { country: 'Jordan', iso2: 'jo', languageCodes: ['ar', 'en'] },
  { country: 'Lebanon', iso2: 'lb', languageCodes: ['ar', 'fr', 'en'] },
  { country: 'Chile', iso2: 'cl', languageCodes: ['es', 'en'] },
  { country: 'Colombia', iso2: 'co', languageCodes: ['es', 'en'] },
  { country: 'Peru', iso2: 'pe', languageCodes: ['es', 'en'] },
  { country: 'Venezuela', iso2: 've', languageCodes: ['es', 'en'] },
  { country: 'Costa Rica', iso2: 'cr', languageCodes: ['es', 'en'] },
  { country: 'Panama', iso2: 'pa', languageCodes: ['es', 'en'] },
  { country: 'Cuba', iso2: 'cu', languageCodes: ['es', 'en'] },
  { country: 'Jamaica', iso2: 'jm', languageCodes: ['en'] },
  { country: 'Trinidad and Tobago', iso2: 'tt', languageCodes: ['en'] },
  { country: 'Hong Kong', iso2: 'hk', languageCodes: ['zh-TW', 'en'] },
  { country: 'Taiwan', iso2: 'tw', languageCodes: ['zh-TW', 'en'] },
  { country: 'Mongolia', iso2: 'mn', languageCodes: ['mn', 'en'] },
  { country: 'Kazakhstan', iso2: 'kz', languageCodes: ['kk', 'ru', 'en'] },
  { country: 'Uzbekistan', iso2: 'uz', languageCodes: ['uz', 'ru', 'en'] },
  { country: 'Georgia', iso2: 'ge', languageCodes: ['ka', 'en'] },
  { country: 'Armenia', iso2: 'am', languageCodes: ['hy', 'en'] },
  { country: 'Azerbaijan', iso2: 'az', languageCodes: ['az', 'en'] },
  { country: 'Albania', iso2: 'al', languageCodes: ['sq', 'en'] },
  { country: 'Bosnia and Herzegovina', iso2: 'ba', languageCodes: ['bs', 'hr', 'sr', 'en'] },
  { country: 'North Macedonia', iso2: 'mk', languageCodes: ['mk', 'en'] },
  { country: 'Malta', iso2: 'mt', languageCodes: ['mt', 'en'] },
  { country: 'Cyprus', iso2: 'cy', languageCodes: ['el', 'tr', 'en'] },
  { country: 'Somalia', iso2: 'so', languageCodes: ['so', 'ar', 'en'] },
  { country: 'Sudan', iso2: 'sd', languageCodes: ['ar', 'en'] },
  { country: 'South Sudan', iso2: 'ss', languageCodes: ['en', 'ar'] },
  { country: 'Tunisia', iso2: 'tn', languageCodes: ['ar', 'fr', 'en'] },
  { country: 'Algeria', iso2: 'dz', languageCodes: ['ar', 'fr', 'en'] },
  { country: 'Libya', iso2: 'ly', languageCodes: ['ar', 'en'] },
  { country: 'Senegal', iso2: 'sn', languageCodes: ['fr', 'en'] },
  { country: 'Ivory Coast', iso2: 'ci', languageCodes: ['fr', 'en'] },
  { country: 'Cameroon', iso2: 'cm', languageCodes: ['fr', 'en'] },
  { country: 'Angola', iso2: 'ao', languageCodes: ['pt', 'en'] },
  { country: 'Mauritius', iso2: 'mu', languageCodes: ['en', 'fr'] },
];

export function languageByCode(code: string): SiteLanguage | undefined {
  return LANGUAGE_BY_CODE.get(code);
}

export function sortedCountryGroups(): CountryLanguageGroup[] {
  return [...COUNTRY_LANGUAGE_GROUPS].sort((a, b) => a.country.localeCompare(b.country));
}

/** Best-effort ISO-3166 alpha-2 from browser locale (e.g. en-US → us). */
export function detectBrowserCountryIso(): string {
  if (typeof navigator === 'undefined') return '';
  const locales = navigator.languages?.length ? [...navigator.languages] : [navigator.language];
  for (const locale of locales) {
    const region = String(locale || '')
      .split('-')[1]
      ?.toLowerCase();
    if (region && COUNTRY_LANGUAGE_GROUPS.some((group) => group.iso2 === region)) {
      return region;
    }
  }
  return '';
}

export function languagesForCountry(iso2: string): SiteLanguage[] {
  const group = COUNTRY_LANGUAGE_GROUPS.find((item) => item.iso2 === iso2.toLowerCase());
  if (!group) return [];
  const seen = new Set<string>();
  const list: SiteLanguage[] = [];
  for (const code of group.languageCodes) {
    if (seen.has(code)) continue;
    const lang = languageByCode(code);
    if (!lang) continue;
    seen.add(code);
    list.push(lang);
  }
  return list;
}

export function allGoogleLanguageCodes(): string {
  return SITE_LANGUAGES.map((lang) => lang.code).join(',');
}

export function detectBrowserLanguageCode(): string {
  if (typeof navigator === 'undefined') return PAGE_SOURCE_LANGUAGE;
  const raw = navigator.language || navigator.languages?.[0] || PAGE_SOURCE_LANGUAGE;
  const normalized = raw.replace('_', '-');
  if (LANGUAGE_BY_CODE.has(normalized)) return normalized;
  const base = normalized.split('-')[0];
  if (base === 'zh') return normalized.includes('TW') || normalized.includes('HK') ? 'zh-TW' : 'zh-CN';
  return LANGUAGE_BY_CODE.has(base) ? base : PAGE_SOURCE_LANGUAGE;
}

export function readActiveTranslateLanguage(): string {
  if (typeof document === 'undefined') return PAGE_SOURCE_LANGUAGE;
  const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
  if (!match?.[1]) return PAGE_SOURCE_LANGUAGE;
  const parts = decodeURIComponent(match[1]).split('/').filter(Boolean);
  const target = parts[parts.length - 1];
  return target || PAGE_SOURCE_LANGUAGE;
}

export function applyTranslateLanguage(code: string) {
  if (typeof document === 'undefined') return;
  const hostname = window.location.hostname;
  const clearCookie = (domain?: string) => {
    const domainPart = domain ? `;domain=${domain}` : '';
    document.cookie = `googtrans=;path=/${domainPart};expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  };

  clearCookie();
  if (hostname) {
    clearCookie(hostname);
    if (!hostname.startsWith('localhost')) clearCookie(`.${hostname}`);
  }

  if (code && code !== PAGE_SOURCE_LANGUAGE) {
    const value = `/${PAGE_SOURCE_LANGUAGE}/${code}`;
    document.cookie = `googtrans=${value};path=/`;
    if (hostname) {
      document.cookie = `googtrans=${value};path=/;domain=${hostname}`;
      if (!hostname.startsWith('localhost')) document.cookie = `googtrans=${value};path=/;domain=.${hostname}`;
    }
  }

  window.location.reload();
}

export function filterLanguages(query: string): SiteLanguage[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return SITE_LANGUAGES;
  return SITE_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(needle) ||
      lang.nativeName.toLowerCase().includes(needle) ||
      lang.code.toLowerCase().includes(needle)
  );
}
