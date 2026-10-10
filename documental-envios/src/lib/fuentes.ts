import {continueRender, delayRender, staticFile} from 'remotion';

// Fuentes locales (licencia OFL, en public/fonts). Se cargan antes del primer fotograma
// para que el render sea determinista y no dependa de la red.
const FUENTES: {familia: string; archivo: string; peso: string; estilo?: string}[] = [
	{familia: 'Cormorant Garamond', archivo: 'cormorant-garamond-latin-500-normal.woff2', peso: '500'},
	{familia: 'Cormorant Garamond', archivo: 'cormorant-garamond-latin-600-normal.woff2', peso: '600'},
	{familia: 'Cormorant Garamond', archivo: 'cormorant-garamond-latin-700-normal.woff2', peso: '700'},
	{familia: 'Cormorant Garamond', archivo: 'cormorant-garamond-latin-500-italic.woff2', peso: '500', estilo: 'italic'},
	{familia: 'Barlow Condensed', archivo: 'barlow-condensed-latin-400-normal.woff2', peso: '400'},
	{familia: 'Barlow Condensed', archivo: 'barlow-condensed-latin-500-normal.woff2', peso: '500'},
	{familia: 'Barlow Condensed', archivo: 'barlow-condensed-latin-600-normal.woff2', peso: '600'},
	{familia: 'Barlow', archivo: 'barlow-latin-400-normal.woff2', peso: '400'},
	{familia: 'Barlow', archivo: 'barlow-latin-500-normal.woff2', peso: '500'},
];

let cargadas = false;

export const cargarFuentes = () => {
	if (cargadas || typeof document === 'undefined') return;
	cargadas = true;
	const handle = delayRender('Cargando fuentes locales');
	Promise.all(
		FUENTES.map((f) => {
			const fuente = new FontFace(f.familia, `url(${staticFile(`fonts/${f.archivo}`)}) format('woff2')`, {
				weight: f.peso,
				style: f.estilo ?? 'normal',
			});
			return fuente.load().then((cargada) => document.fonts.add(cargada));
		}),
	)
		.then(() => continueRender(handle))
		.catch((err) => {
			console.error('Error cargando fuentes', err);
			continueRender(handle);
		});
};
