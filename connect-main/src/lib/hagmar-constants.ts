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

// Certification types
export const HAGMAR_CERT_TYPES = [
  { value: "mag", label: "הסמכת מאג" },
  { value: "matol", label: "הסמכת מטול" },
  { value: "drone", label: "הסמכת רחפן" },
  { value: "nagmash", label: 'הסמכת נגמ"ש' },
  { value: "medic", label: "הסמכת חובש" },
] as const;

export type HagmarCertType = typeof HAGMAR_CERT_TYPES[number]['value'];

// Certification validity: 12 months
export const CERT_VALIDITY_DAYS = 365;
export const CERT_WARNING_DAYS = 335; // 30 days before expiry

// Shooting range validity: same as PLANAG (180 days / 6 months)
export const SHOOTING_VALIDITY_DAYS = 180;
export const SHOOTING_WARNING_DAYS = 150;

// Equipment types
export const HAGMAR_EQUIPMENT_TYPES = [
  { value: "weapon", label: "נשק" },
  { value: "gear", label: "ציוד לוחם" },
  { value: "communication", label: "קשר" },
  { value: "medical", label: "ציוד רפואי" },
  { value: "vehicle", label: "רכב" },
] as const;

// Training event types
export const HAGMAR_EVENT_TYPES = [
  { value: "shooting_range", label: "מטווח" },
  { value: "drill", label: "תרגיל" },
  { value: "briefing", label: "תדריך" },
  { value: "certification", label: "הסמכה" },
  { value: "other", label: "אחר" },
] as const;