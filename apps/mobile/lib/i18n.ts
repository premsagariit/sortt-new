export type SupportedLanguage = 'en' | 'te' | 'hi';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'te', 'hi'];
export const LANGUAGE_STORAGE_KEY = 'preferred_language';

type TranslationMap = Record<string, string>;
type TranslationTable = Record<SupportedLanguage, TranslationMap>;

const TRANSLATIONS: TranslationTable = {
  en: {},
  te: {
    'Get the best price for your scrap': 'మీ వ్యర్థాలకు ఉత్తమ ధర పొందండి',
    'See live rates in your area. Compare aggregator prices and earn more from every pickup — no guesswork.': 'మీ ప్రాంతంలో లైవ్ రేట్లు చూడండి. అగ్రిగేటర్ ధరలను పోల్చి ప్రతి పికప్‌లో ఎక్కువ సంపాదించండి.',
    'AI evaluates your scrap instantly': 'AI మీ వ్యర్థాలను వెంటనే అంచనా వేస్తుంది',
    'Snap a photo. Our AI identifies materials, estimates weight, and gives you an instant quote — before any aggregator arrives.': 'ఫోటో తీసండి. మా AI పదార్థాలను గుర్తించి బరువును అంచనా వేసి వెంటనే ధర చెబుతుంది.',
    'Pickup at your doorstep': 'మీ ఇంటి వద్దే పికప్',
    'Verified aggregators near you come to you. Track in real time, confirm with OTP, get paid on the spot.': 'మీ సమీపంలోని ధృవీకరించిన అగ్రిగేటర్లు మీ దగ్గరికి వస్తారు. రియల్ టైమ్ ట్రాకింగ్, OTP ధృవీకరణ, వెంటనే చెల్లింపు.',
    'Every rupee tracked. Every pickup recorded.': 'ప్రతి రూపాయి ట్రాక్. ప్రతి పికప్ రికార్డ్.',
    'Verified reports and digital records for every transaction. Digital transparency at every step.': 'ప్రతి లావాదేవీకి ధృవీకరించిన రిపోర్టులు మరియు డిజిటల్ రికార్డులు. ప్రతి దశలో పారదర్శకత.',
    'Next': 'తర్వాత',
    'Get Started': 'ప్రారంభించండి',
    'Skip': 'దాటవేయి',
    'Language:': 'భాష:',
    'Language': 'భాష',
    'English': 'ఇంగ్లీష్',
    'Telugu': 'తెలుగు',
    'Hindi': 'హిందీ',
    'Apply Language': 'భాషను వర్తింపజేయండి',
    'Applying language...': 'భాషను వర్తింపజేస్తున్నాం...',
    'Language preferences updated': 'భాషా అభిరుచులు నవీకరించబడ్డాయి',
    "We're currently translating Sortt into Telugu. Some parts of the app may still appear in English during this pilot phase.": 'Sortt యాప్‌ను ప్రస్తుతం తెలుగులోకి అనువదిస్తున్నాము. ఈ పైలట్ దశలో కొన్ని భాగాలు ఇంకా ఇంగ్లీష్‌లో కనిపించవచ్చు.',
    'Settings': 'సెట్టింగ్స్',
    'ACCOUNT': 'ఖాతా',
    'PREFERENCES': 'ప్రాధాన్యాలు',
    'NOTIFICATIONS': 'నోటిఫికేషన్లు',
    'LEGAL & ABOUT': 'చట్టపరమైన & సమాచారం',
    'Edit Profile': 'ప్రొఫైల్ సవరించండి',
    'Push Notifications': 'పుష్ నోటిఫికేషన్లు',
    'Dark Mode': 'డార్క్ మోడ్',
    'System default': 'సిస్టమ్ డిఫాల్ట్',
    'Terms of Service': 'సేవా నిబంధనలు',
    'Privacy Policy': 'గోప్యతా విధానం',
    'Log Out': 'లాగ్ అవుట్',
    'Delete Account': 'ఖాతాను తొలగించండి',
    'Help & Support': 'సహాయం & మద్దతు',
    'Notifications': 'నోటిఫికేషన్లు',
    'Mark all read': 'అన్నింటిని చదివినట్లుగా గుర్తించు',
    'All caught up!': 'అన్నీ చదివేశారు!',
    'You have no new notifications right now.': 'ఇప్పుడే కొత్త నోటిఫికేషన్లు లేవు.',
    'List Scrap': 'వ్యర్థాలను జాబితా చేయండి',
    'Step 1 of 4': '4లో 1వ దశ',
    'Step 2 of 4': '4లో 2వ దశ',
    'Step 3 of 4': '4లో 3వ దశ',
    'Step 4 of 4': '4లో 4వ దశ',
    'Capture Scrap Photos': 'వ్యర్థాల ఫోటోలు తీయండి',
    'Our AI will analyze your scrap to estimate materials and weights automatically.': 'మా AI మీ వ్యర్థాలను విశ్లేషించి పదార్థాలు మరియు బరువును అంచనా వేస్తుంది.',
    'Camera access denied. Enable it in Settings.': 'కెమెరా అనుమతి లేదు. సెట్టింగ్స్‌లో ప్రారంభించండి.',
    'Opening camera...': 'కెమెరా తెరుస్తోంది...',
    'Tap to take a photo': 'ఫోటో కోసం నొక్కండి',
    'Edit': 'సవరించు',
    'photos': 'ఫోటోలు',
    'photo': 'ఫోటో',
    'Analyzing photo...': 'ఫోటో విశ్లేషణలో ఉంది...',
    'AI could not confidently identify materials. You can enter them manually in the next step.': 'AI పదార్థాలను నమ్మకంగా గుర్తించలేకపోయింది. తర్వాతి దశలో మీరు చేతితో నమోదు చేయవచ్చు.',
    'AI Analysis Complete': 'AI విశ్లేషణ పూర్తైంది',
    'Materials and weights have been auto-extracted! You can review and edit them in the next step.': 'పదార్థాలు మరియు బరువులు ఆటోగా తీసుకోబడ్డాయి. తర్వాతి దశలో సరిచూడండి.',
    'Select Materials': 'పదార్థాలు ఎంచుకోండి',
    'Analyzing...': 'విశ్లేషణలో...',
    'Next: Review Materials': 'తర్వాత: పదార్థాలు పరిశీలించండి',
    'Metal': 'మెటల్',
    'Plastic': 'ప్లాస్టిక్',
    'Paper': 'కాగితం',
    'E-Waste': 'ఇ-వ్యర్థం',
    'Fabric': 'వస్త్రం',
    'Glass': 'గాజు',
    'Other': 'ఇతర',
    'Other Item': 'ఇతర అంశం',
    'Min. 1 kg': 'కనీసం 1 కిలో',
    'Min. 2 kg': 'కనీసం 2 కిలో',
    'Min. 0.5 kg': 'కనీసం 0.5 కిలో',
    'Iron, copper, aluminium': 'ఇనుము, రాగి, అల్యూమినియం',
    'Newspaper, cardboard': 'వార్తాపత్రిక, కార్డ్‌బోర్డ్',
    'PET, HDPE, other': 'PET, HDPE, ఇతర',
    'Electronics, cables': 'ఎలక్ట్రానిక్స్, కేబుల్స్',
    'Clothes, textile': 'బట్టలు, టెక్స్టైల్',
    'Bottles, flat glass': 'బాటిళ్లు, ఫ్లాట్ గాజు',
    'Miscellaneous scrap': 'మిశ్రమ వ్యర్థాలు',
    'Go back': 'వెనక్కి',
    'SELLER': 'అమ్మకందారు',
    'AGGREGATOR': 'అగ్రిగేటర్',
  },
  hi: {
    'Get the best price for your scrap': 'अपने स्क्रैप का सबसे अच्छा दाम पाएं',
    'See live rates in your area. Compare aggregator prices and earn more from every pickup — no guesswork.': 'अपने क्षेत्र में लाइव रेट देखें। एग्रीगेटर कीमतें तुलना करें और हर पिकअप से ज्यादा कमाएं।',
    'AI evaluates your scrap instantly': 'AI आपके स्क्रैप का तुरंत आकलन करता है',
    'Snap a photo. Our AI identifies materials, estimates weight, and gives you an instant quote — before any aggregator arrives.': 'फोटो लें। हमारा AI सामग्री पहचानता है, वजन का अनुमान देता है और तुरंत कीमत बताता है।',
    'Pickup at your doorstep': 'आपके दरवाजे पर पिकअप',
    'Verified aggregators near you come to you. Track in real time, confirm with OTP, get paid on the spot.': 'आपके पास के सत्यापित एग्रीगेटर आपके पास आते हैं। रियल टाइम ट्रैक करें, OTP से पुष्टि करें और तुरंत भुगतान पाएं।',
    'Every rupee tracked. Every pickup recorded.': 'हर रुपया ट्रैक। हर पिकअप रिकॉर्ड।',
    'Verified reports and digital records for every transaction. Digital transparency at every step.': 'हर लेनदेन के लिए सत्यापित रिपोर्ट और डिजिटल रिकॉर्ड। हर कदम पर पारदर्शिता।',
    'Next': 'अगला',
    'Get Started': 'शुरू करें',
    'Skip': 'छोड़ें',
    'Language:': 'भाषा:',
    'Language': 'भाषा',
    'English': 'अंग्रेज़ी',
    'Telugu': 'तेलुगु',
    'Hindi': 'हिंदी',
    'Apply Language': 'भाषा लागू करें',
    'Applying language...': 'भाषा लागू की जा रही है...',
    'Language preferences updated': 'भाषा प्राथमिकताएं अपडेट हुईं',
    "We're currently translating Sortt into Telugu. Some parts of the app may still appear in English during this pilot phase.": 'हम अभी Sortt का अनुवाद कर रहे हैं। इस पायलट चरण में कुछ हिस्से अभी भी अंग्रेज़ी में दिख सकते हैं।',
    'Settings': 'सेटिंग्स',
    'ACCOUNT': 'खाता',
    'PREFERENCES': 'प्राथमिकताएं',
    'NOTIFICATIONS': 'सूचनाएं',
    'LEGAL & ABOUT': 'कानूनी और जानकारी',
    'Edit Profile': 'प्रोफाइल संपादित करें',
    'Push Notifications': 'पुश सूचनाएं',
    'Dark Mode': 'डार्क मोड',
    'System default': 'सिस्टम डिफॉल्ट',
    'Terms of Service': 'सेवा की शर्तें',
    'Privacy Policy': 'गोपनीयता नीति',
    'Log Out': 'लॉग आउट',
    'Delete Account': 'खाता हटाएं',
    'Help & Support': 'सहायता और समर्थन',
    'Notifications': 'सूचनाएं',
    'Mark all read': 'सभी पढ़ा हुआ चिह्नित करें',
    'All caught up!': 'सब अपडेट है!',
    'You have no new notifications right now.': 'अभी कोई नई सूचना नहीं है।',
    'List Scrap': 'स्क्रैप सूचीबद्ध करें',
    'Step 1 of 4': '4 में से चरण 1',
    'Step 2 of 4': '4 में से चरण 2',
    'Step 3 of 4': '4 में से चरण 3',
    'Step 4 of 4': '4 में से चरण 4',
    'Capture Scrap Photos': 'स्क्रैप की फोटो लें',
    'Our AI will analyze your scrap to estimate materials and weights automatically.': 'हमारा AI आपके स्क्रैप का विश्लेषण करके सामग्री और वजन का अनुमान लगाएगा।',
    'Camera access denied. Enable it in Settings.': 'कैमरा अनुमति नहीं मिली। सेटिंग्स में सक्षम करें।',
    'Opening camera...': 'कैमरा खुल रहा है...',
    'Tap to take a photo': 'फोटो लेने के लिए टैप करें',
    'Edit': 'संपादित करें',
    'photos': 'फोटो',
    'photo': 'फोटो',
    'Analyzing photo...': 'फोटो का विश्लेषण हो रहा है...',
    'AI could not confidently identify materials. You can enter them manually in the next step.': 'AI सामग्री को भरोसे के साथ पहचान नहीं पाया। अगले चरण में आप इसे मैनुअली भर सकते हैं।',
    'AI Analysis Complete': 'AI विश्लेषण पूरा',
    'Materials and weights have been auto-extracted! You can review and edit them in the next step.': 'सामग्री और वजन अपने आप निकाले गए हैं। अगले चरण में समीक्षा करें।',
    'Select Materials': 'सामग्री चुनें',
    'Analyzing...': 'विश्लेषण जारी...',
    'Next: Review Materials': 'अगला: सामग्री देखें',
    'Metal': 'धातु',
    'Plastic': 'प्लास्टिक',
    'Paper': 'कागज',
    'E-Waste': 'ई-कचरा',
    'Fabric': 'कपड़ा',
    'Glass': 'कांच',
    'Other': 'अन्य',
    'Other Item': 'अन्य वस्तु',
    'Min. 1 kg': 'न्यून. 1 किग्रा',
    'Min. 2 kg': 'न्यून. 2 किग्रा',
    'Min. 0.5 kg': 'न्यून. 0.5 किग्रा',
    'Iron, copper, aluminium': 'लोहा, तांबा, एल्युमिनियम',
    'Newspaper, cardboard': 'अखबार, गत्ता',
    'PET, HDPE, other': 'PET, HDPE, अन्य',
    'Electronics, cables': 'इलेक्ट्रॉनिक्स, केबल',
    'Clothes, textile': 'कपड़े, टेक्सटाइल',
    'Bottles, flat glass': 'बोतलें, फ्लैट ग्लास',
    'Miscellaneous scrap': 'मिश्रित स्क्रैप',
    'Go back': 'वापस जाएं',
    'SELLER': 'विक्रेता',
    'AGGREGATOR': 'एग्रीगेटर',
  },
};

const LANGUAGE_NAME_KEYS: Record<SupportedLanguage, string> = {
  en: 'English',
  te: 'Telugu',
  hi: 'Hindi',
};

let currentLanguage: SupportedLanguage = DEFAULT_LANGUAGE;

const parsePrimaryLanguageToken = (value?: string | null): string => {
  if (!value) return '';
  return value.split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? '';
};

export const normalizeLanguage = (value?: string | null): SupportedLanguage => {
  const token = parsePrimaryLanguageToken(value)
    .replace('_', '-')
    .split('-')[0];

  if (token === 'te') return 'te';
  if (token === 'hi') return 'hi';
  return 'en';
};

export const getLocaleTag = (language: SupportedLanguage): string => {
  if (language === 'te') return 'te-IN';
  if (language === 'hi') return 'hi-IN';
  return 'en-IN';
};

export const setCurrentLanguage = (language: SupportedLanguage) => {
  currentLanguage = normalizeLanguage(language);
};

export const getCurrentLanguage = (): SupportedLanguage => currentLanguage;

const interpolate = (template: string, params?: Record<string, string | number>): string => {
  if (!params) return template;

  let out = template;
  for (const [key, value] of Object.entries(params)) {
    out = out.replaceAll(`{{${key}}}`, String(value));
  }
  return out;
};

export const translate = (
  text: string,
  options?: {
    language?: SupportedLanguage;
    params?: Record<string, string | number>;
  }
): string => {
  if (!text) return text;

  const language = options?.language ?? currentLanguage;
  if (language === 'en') {
    return interpolate(text, options?.params);
  }

  const translated = TRANSLATIONS[language][text] ?? text;
  return interpolate(translated, options?.params);
};

export const getLanguageDisplayName = (
  language: SupportedLanguage,
  inLanguage: SupportedLanguage = language
): string => {
  const key = LANGUAGE_NAME_KEYS[language];
  return translate(key, { language: inLanguage });
};
