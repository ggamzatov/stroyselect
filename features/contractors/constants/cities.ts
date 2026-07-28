export const DAGESTAN_CITIES = [
  "Махачкала",
  "Каспийск",
  "Дербент",
  "Хасавюрт",
  "Буйнакск",
  "Кизляр",
  "Избербаш",
  "Дагестанские Огни",
  "Кизилюрт",
  "Южно-Сухокумск",
] as const;

export type DagestanCity =
  (typeof DAGESTAN_CITIES)[number];