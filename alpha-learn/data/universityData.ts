import { University } from '@/types';

export const UNIVERSITIES: University[] = [
  { id: 'uct',  name: 'University of Cape Town',         abbr: 'UCT',  closing: '31 July 2026',    fee: 'R100',  minAps: 34, tag: 'High Competition',      color: 'bg-blue-600',  link: 'https://applyonline.uct.ac.za' },
  { id: 'wits', name: 'Wits University',                  abbr: 'Wits', closing: '30 Sep 2026',     fee: 'R100',  minAps: 34, tag: 'Health Sci Closes June', color: 'bg-blue-900',  link: 'https://www.wits.ac.za/applications/' },
  { id: 'up',   name: 'University of Pretoria',           abbr: 'UP',   closing: '30 Jun 2026',     fee: 'R300',  minAps: 30, tag: 'Closes Soon',           color: 'bg-red-600',   link: 'https://www.up.ac.za/online-application' },
  { id: 'su',   name: 'Stellenbosch University',          abbr: 'SU',   closing: '31 Jul 2026',     fee: 'R100',  minAps: 32, tag: 'Top Sciences',          color: 'bg-red-800',   link: 'https://student.sun.ac.za/' },
  { id: 'uj',   name: 'University of Johannesburg',       abbr: 'UJ',   closing: '31 Oct 2026',     fee: 'Free',  minAps: 28, tag: 'Free Online App',       color: 'bg-orange-500', link: 'https://www.uj.ac.za/admission-aid/' },
  { id: 'uwc',  name: 'University of the Western Cape',   abbr: 'UWC',  closing: '30 Sep 2026',     fee: 'Free',  minAps: 27, tag: 'Dentistry Closes Aug',  color: 'bg-yellow-600', link: 'https://www.uwc.ac.za/' },
  { id: 'ukzn', name: 'University of KwaZulu-Natal',      abbr: 'UKZN', closing: '30 Sep 2026',     fee: 'R150',  minAps: 28, tag: 'Strong Engineering',    color: 'bg-teal-700',  link: 'https://www.ukzn.ac.za/apply/' },
  { id: 'nmu',  name: 'Nelson Mandela University',        abbr: 'NMU',  closing: '30 Sep 2026',     fee: 'Free',  minAps: 26, tag: 'Free Online App',       color: 'bg-green-700', link: 'https://www.mandela.ac.za/Admissions' },
];

export const DEFAULT_SUBJECTS = [
  { subj: 'Mathematics',          pct: 65, excluded: false },
  { subj: 'Physical Sciences',    pct: 62, excluded: false },
  { subj: 'English HL',           pct: 70, excluded: false },
  { subj: 'Afrikaans FAL',        pct: 60, excluded: false },
  { subj: 'Life Sciences',        pct: 68, excluded: false },
  { subj: 'Information Technology', pct: 72, excluded: false },
  { subj: 'Life Orientation',     pct: 80, excluded: true },
];

export function pctToAps(pct: number): number {
  if (pct >= 90) return 7;
  if (pct >= 80) return 6;
  if (pct >= 70) return 5;
  if (pct >= 60) return 4;
  if (pct >= 50) return 3;
  if (pct >= 40) return 2;
  if (pct >= 30) return 1;
  return 0;
}
