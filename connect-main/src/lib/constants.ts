export const OUTPOSTS = [
  "כוכב יעקב",
  "רמה",
  "ענתות",
  "בית אל",
  "עפרה",
  "מבו\"ש",
  "עטרת",
  "חורש ירון",
  "נווה יאיר",
  "רנתיס",
  "מכבים",
] as const;

export const SHIFT_TYPES = [
  "משמרת בוקר",
  "משמרת צהריים",
  "משמרת ערב",
] as const;

export const COMBAT_EQUIPMENT = [
  "ווסט קרמי",
  "קסדה",
  "נשק אישי",
  "מחסניות",
] as const;

export const PRE_MOVEMENT_CHECKS = [
  "בדיקת שמן",
  "בדיקת נוזל קירור",
  "בדיקת נוזל בלמים",
  "בדיקת מים לוישרים",
  "אומים",
  "לחץ אוויר",
  "נורות בלוח שעונים",
  'שפ"ם - ניקוי שמשות פנסים מראות',
  "בדיקת נזילות ומכות",
] as const;

export const DRIVER_TOOLS = [
  "ג'ק ומוט לג'ק",
  "מפתח גלגלים",
  "משולש אזהרה",
  "אפודה זוהרת",
  "מטף",
  "רשיון רכב",
] as const;

export const DRILLS = [
  "תרגולת ירידה לשול",
  "תרגולת התהפכות",
  "תרגולת שריפה",
] as const;

export const VEHICLE_PHOTOS = [
  { id: "front", label: "תמונת חזית הרכב" },
  { id: "left", label: "תמונת צד שמאל הרכב" },
  { id: "right", label: "תמונת צד ימין הרכב" },
  { id: "back", label: "תמונה אחורית של הרכב" },
  { id: "steering", label: "תמונה של ההגה של הרכב" },
] as const;

export type Outpost = typeof OUTPOSTS[number];
export type ShiftType = typeof SHIFT_TYPES[number];
export type DrillType = typeof DRILLS[number];