// HAGMAR Department Hierarchy: Region → Company → Settlements

export interface HagmarSettlement {
  name: string;
}

export interface HagmarCompany {
  name: string;
  settlements: string[];
}

export interface HagmarRegion {
  name: string;
  companies: HagmarCompany[];
}

export const HAGMAR_REGIONS: HagmarRegion[] = [
  {
    name: "ארץ בנימין",
    companies: [
      { name: 'פלוגת מבוא שילה', settlements: ["כוכב השחר", "רימונים", "מלאכי השלום"] },
      { name: "פלוגת עטרת", settlements: ["עטרת"] },
      { name: "פלוגת עפרה", settlements: ["עפרה"] },
      { name: "פלוגת בית אל", settlements: ["בית אל", "גבעת אסף"] },
    ],
  },
  {
    name: "גבעת בנימין",
    companies: [
      { name: "פלוגת כוכב יעקב", settlements: ["כוכב יעקב", "פסגות"] },
      { name: "פלוגת רמה", settlements: ["מעלה מכמש", "מצפה דני", "מגרון", "נווה ארז", "מצפה חגית"] },
      { name: "פלוגת ענתות", settlements: ["אדם", "בני אדם"] },
    ],
  },
  {
    name: "טלמונים",
    companies: [
      { name: "פלוגת נווה יאיר", settlements: ["נווה צוף"] },
      { name: "פלוגת חורש ירון", settlements: ["נחליאל", "חרשה", "טלמון", "דולב", "נריה", "כרם רעים", "שדה אפרים"] },
      { name: "פלוגת רנתיס", settlements: ["נעלה", "נילי", "עופרים", "בית אריה"] },
    ],
  },
];

// Flat list of all settlements
export const HAGMAR_ALL_SETTLEMENTS = HAGMAR_REGIONS.flatMap(r =>
  r.companies.flatMap(c => c.settlements)
);

// Get company from settlement
export const getCompanyFromSettlement = (settlement: string): string | null => {
  for (const region of HAGMAR_REGIONS) {
    for (const company of region.companies) {
      if (company.settlements.includes(settlement)) {
        return company.name;
      }
    }
  }
  return null;
};

// Get region from settlement
export const getRegionFromSettlement = (settlement: string): string | null => {
  for (const region of HAGMAR_REGIONS) {
    for (const company of region.companies) {
      if (company.settlements.includes(settlement)) {
        return region.name;
      }
    }
  }
  return null;
};

// Certification types (פק"ל)
export const HAGMAR_CERT_TYPES = [
  { value: "mag", label: "הסמכת מאג" },
  { value: "matol", label: "הסמכת מטול" },
  { value: "drone", label: "הסמכת רחפן" },
  { value: "nagmash", label: 'הסמכת נגמ"ש' },
  { value: "medic", label: "הסמכת חובש" },
] as const;

export type HagmarCertType = typeof HAGMAR_CERT_TYPES[number]['value'];

// Certification validity: 6 months (refresh required)
export const CERT_VALIDITY_DAYS = 180;
export const CERT_WARNING_DAYS = 150; // 30 days before expiry

// Shooting range validity: 3 months (90 days) per user requirement
export const SHOOTING_VALIDITY_DAYS = 90;
export const SHOOTING_WARNING_DAYS = 60; // 30 days before expiry

// Equipment types
export const HAGMAR_EQUIPMENT_TYPES = [
  { value: "weapon", label: "נשק" },
  { value: "gear", label: "ציוד לוחם" },
  { value: "communication", label: "קשר" },
  { value: "medical", label: "ציוד רפואי" },
  { value: "vehicle", label: "רכב" },
] as const;

// AMLACH items - specific military equipment for settlement tracking
export const HAGMAR_AMLACH_ITEMS = [
  { name: "A9", hasSubtype: false },
  { name: "M16", hasSubtype: false },
  { name: "M4", hasSubtype: false },
  { name: "ערד", hasSubtype: false },
  { name: 'מאג+קנס"פ', hasSubtype: false },
  { name: "נשקי קלעים", hasSubtype: false },
  { name: 'אמר"ל', hasSubtype: true, subtypeLabel: "סוג אמר\"ל" },
  { name: "רחפן", hasSubtype: true, subtypeLabel: "סוג רחפן" },
  { name: "משקפת", hasSubtype: false },
  { name: "רימוני רסס", hasSubtype: false },
  { name: "מטול נפיץ", hasSubtype: false },
  { name: "מטול תאורה", hasSubtype: false },
  { name: "ליונט", hasSubtype: false },
  { name: "מכלול", hasSubtype: false },
  { name: 'מ.ק 624', hasSubtype: false },
  { name: 'מע"ד', hasSubtype: false },
  { name: 'רמ"ק', hasSubtype: false },
  { name: "קשר התיישבות נייח", hasSubtype: false },
  { name: "קשר התיישבות נייד", hasSubtype: false },
  { name: "זוג קרמי", hasSubtype: false },
] as const;

// Training event types
export const HAGMAR_EVENT_TYPES = [
  { value: "shooting_range", label: "מטווח" },
  { value: "settlement_drill", label: "תרגיל ביישוב" },
  { value: "simulator", label: "סימולטור" },
  { value: "drill", label: "תרגיל" },
  { value: "briefing", label: "תדריך" },
  { value: "certification", label: "הסמכה" },
  { value: "other", label: "אחר" },
] as const;

// Defensive security types
export const DEFENSIVE_SECURITY_TYPES = [
  { value: "technological", label: "טכנולוגי" },
  { value: "engineering", label: "הנדסי" },
  { value: "none", label: "ללא" },
  { value: "combined", label: "משולב" },
] as const;

// Command center types
export const COMMAND_CENTER_TYPES = [
  { value: "247", label: "24/7" },
  { value: "guard", label: 'ש.ג' },
  { value: "municipal", label: "מונציפלי" },
  { value: "none", label: "ללא" },
] as const;

// Professional development types
export const PROF_DEV_TYPES = [
  { value: "ravshatz", label: 'השתלמות רבש"צים' },
  { value: "mm_ravshatz", label: 'השתלמות מ"מ רבש"צ' },
] as const;