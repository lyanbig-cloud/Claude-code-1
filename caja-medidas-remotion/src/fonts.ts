import {loadFont} from '@remotion/fonts';
import condensed600 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2';
import barlow400 from '@fontsource/barlow/files/barlow-latin-400-normal.woff2';
import barlow500 from '@fontsource/barlow/files/barlow-latin-500-normal.woff2';
import barlow600 from '@fontsource/barlow/files/barlow-latin-600-normal.woff2';
import cormorant500 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2';
import cormorant600 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2';

export const SERIF = '"Cormorant Garamond", serif';
export const SANS = 'Barlow, sans-serif';
export const CONDENSED = '"Barlow Condensed", sans-serif';

const faces = [
	{family: 'Barlow Condensed', url: condensed600, weight: '600'},
	{family: 'Barlow', url: barlow400, weight: '400'},
	{family: 'Barlow', url: barlow500, weight: '500'},
	{family: 'Barlow', url: barlow600, weight: '600'},
	{family: 'Cormorant Garamond', url: cormorant500, weight: '500'},
	{family: 'Cormorant Garamond', url: cormorant600, weight: '600'},
];

// loadFont() wraps delayRender(), so no frame renders before the fonts.
export const fontsLoaded = Promise.all(faces.map((f) => loadFont({...f, format: 'woff2'})));
