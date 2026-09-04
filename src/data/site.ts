// Site-wide constants. One home for every claim that appears in more than
// one place, so a correction is a single edit.

/** SAM.gov Unique Entity ID — public registry data, verifiable by anyone. */
export const UEI = 'ZWA5GLBFS9A5';

/** SBA's certification search (DSBS moved here; the old pronet host is dead). */
export const SBA_SEARCH = 'https://search.certifications.sba.gov/';

/** Company page on LinkedIn (C-9.4). */
export const LINKEDIN_COMPANY = 'https://www.linkedin.com/company/wrightintel-net/';

/** Capability statement PDF. The key is unchanged from the prior site because
 *  SBA's certification profile links to it — see docs/redirects.md. */
export const CAPABILITY_PDF = '/assets/img/WIS_Capability_Statement.pdf';

/** Published location — city form, per the WO-2 capability statement. */
export const LOCATION_SHORT = 'Lancaster, VA';
export const LOCATION = 'Lancaster, VA 22503';

/** Footer line, verbatim from the prior site's footer. */
export const BUMPER = 'Your first choice for understanding Government Intelligence Community Customers.';

/** Hero tagline, verbatim from the prior site (content inventory C-07). */
export const TAGLINE = 'Bringing Brilliant Teams Together';
