// The roster. Order is the published order: CEO · CTO · Chief Scientist.
// Titles are owner rulings of 3 Sep 2026 (WO-4 §4). A person page and the
// People index both read from here, so a title change is one edit.

export interface Person {
  slug: string;
  /** Name as published. */
  name: string;
  /** Short form for the nav ("CEO — Lynn Wright"). */
  short: string;
  title: string;
  /** Portrait under public/. Alt text is descriptive only, never bio (FR-META.5). */
  portrait: string;
  /** One line for the roster card. Sourced, not invented. */
  line: string;
  /** Personal LinkedIn profile, when the owner has supplied it. */
  linkedin?: string;
}

export const people: Person[] = [
  {
    slug: 'lynn-wright',
    name: 'Lynn Wright',
    short: 'CEO',
    title: 'Chief Executive Officer',
    portrait: '/assets/img/lynn-wright.jpg',
    line: 'Career defense intelligence professional with 35 years of experience.',
  },
  {
    slug: 'tony-wright',
    name: 'Tony Wright',
    short: 'CTO',
    title: 'Chief Technology Officer',
    portrait: '/assets/img/tony-wright.jpg',
    line: 'Program and operations leader who runs the seam between customers, production floors, and software teams.',
    linkedin: 'https://www.linkedin.com/in/anthonywrightfairfax',
  },
  {
    slug: 'greg-culkowski',
    name: 'Greg Culkowski',
    short: 'Chief Scientist',
    title: 'Chief Scientist',
    portrait: '/assets/img/greg-culkowski.jpg',
    line: '30+ years of technical leadership delivering COMSAT, network, and IT solutions.',
  },
];

export const href = (p: Person) => `/people/${p.slug}/`;
export const bySlug = (slug: string): Person => {
  const p = people.find((x) => x.slug === slug);
  if (!p) throw new Error(`No person with slug ${slug}`);
  return p;
};
