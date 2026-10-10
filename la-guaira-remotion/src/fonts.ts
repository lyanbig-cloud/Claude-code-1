import {loadFont} from '@remotion/fonts';
import condensed500 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal.woff2';
import condensed600 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2';
import barlow400 from '@fontsource/barlow/files/barlow-latin-400-normal.woff2';
import barlow500 from '@fontsource/barlow/files/barlow-latin-500-normal.woff2';

export const TITLE_FONT = '"Barlow Condensed", sans-serif';
export const BODY_FONT = 'Barlow, sans-serif';

const faces = [
	{family: 'Barlow Condensed', url: condensed500, weight: '500'},
	{family: 'Barlow Condensed', url: condensed600, weight: '600'},
	{family: 'Barlow', url: barlow400, weight: '400'},
	{family: 'Barlow', url: barlow500, weight: '500'},
];

// loadFont() wraps delayRender(), so no frame renders before the fonts.
export const fontsLoaded = Promise.all(faces.map((f) => loadFont({...f, format: 'woff2'})));
