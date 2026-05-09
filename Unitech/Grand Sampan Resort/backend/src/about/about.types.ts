export const ABOUT_SECTIONS = {
  ABOUT_PROJECT: 'ABOUT_PROJECT',
  ABOUT_COMPOUND: 'ABOUT_COMPOUND',
  ABOUT_COMPANY: 'ABOUT_COMPANY'
} as const;

export type AboutSectionValue = (typeof ABOUT_SECTIONS)[keyof typeof ABOUT_SECTIONS];
export const ABOUT_SECTION_VALUES = Object.values(ABOUT_SECTIONS);
