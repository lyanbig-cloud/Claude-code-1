import {loadFont as loadBricolage} from '@remotion/google-fonts/BricolageGrotesque';
import {loadFont as loadManrope} from '@remotion/google-fonts/Manrope';

// Bricolage Grotesque SemiBold: títulos. Manrope Regular/SemiBold: texto secundario.
const bricolage = loadBricolage('normal', {weights: ['600'], subsets: ['latin']});
const manrope = loadManrope('normal', {weights: ['400', '600'], subsets: ['latin']});

export const FONTS = {
  title: bricolage.fontFamily,
  body: manrope.fontFamily,
} as const;
