import {z} from 'zod';
import {zColor} from '@remotion/zod-types';

// Editable from the Remotion Studio sidebar. Geography lives in geo/florida.json.

const lonLat = z.tuple([z.number(), z.number()]);
const cameraKey = z.object({
	foco: lonLat.describe('[longitud, latitud] en el punto focal'),
	pxPorGrado: z.number().min(40).max(900),
	inclinacion: z.number().min(0).max(55),
});
const pin = z.object({
	titulo: z.string(),
	subtitulo: z.string(),
	etiqueta: z.string().describe('Texto destacado bajo el título (vacío = sin etiqueta)'),
	lado: z.enum(['izquierda', 'derecha']),
	alturaMastil: z.number().min(40).max(400),
});
const mapLabel = z.object({
	texto: z.string(),
	coord: lonLat,
	tamano: z.number(),
	espaciado: z.number(),
	opacidad: z.number().min(0).max(1),
	estilo: z.enum(['pais', 'mar', 'accidente', 'isla']),
});

export const floridaSchema = z.object({
	marcadores: z.object({
		tampa: pin,
		miami: pin,
		destino: pin,
		mostrarDestino: z.boolean(),
	}),
	rotulosMapa: z.array(mapLabel),
	colores: z.object({
		rutaTerrestre: zColor(),
		rutaMaritima: zColor(),
		marcadorOrigen: zColor(),
		marcadorDestino: zColor(),
		etiqueta: zColor(),
		fronteras: zColor(),
		texto: zColor(),
	}),
	// Frames at 24 fps (8 s = 192 frames).
	tiempos: z.object({
		marcadorTampa: z.number(),
		camionInicio: z.number(),
		camionFin: z.number(),
		marcadorMiami: z.number(),
		alejamientoInicio: z.number(),
		alejamientoFin: z.number(),
		rutaMarInicio: z.number(),
		rutaMarFin: z.number(),
		buqueInicio: z.number(),
		buqueAvanceFinal: z.number().min(0).max(1).describe('Fracción de la ruta recorrida por el buque al terminar'),
		marcadorDestino: z.number(),
	}),
	camara: z.object({
		florida: cameraKey,
		caribe: cameraKey,
	}),
	atmosfera: z.object({
		nubes: z.boolean(),
		bruma: z.number().min(0).max(1),
		grano: z.number().min(0).max(0.3),
		vineta: z.number().min(0).max(1),
	}),
});

export type FloridaProps = z.infer<typeof floridaSchema>;

export const floridaDefaults: FloridaProps = {
	marcadores: {
		tampa: {titulo: 'TAMPA', subtitulo: 'Florida, EE. UU.', etiqueta: 'SALIDA MIÉRCOLES', lado: 'derecha', alturaMastil: 230},
		miami: {titulo: 'MIAMI', subtitulo: 'Florida, EE. UU.', etiqueta: 'SALIDA SÁBADO', lado: 'derecha', alturaMastil: 120},
		destino: {titulo: 'LA GUAIRA', subtitulo: 'Venezuela', etiqueta: '', lado: 'izquierda', alturaMastil: 150},
		mostrarDestino: true,
	},
	rotulosMapa: [
		{texto: 'FLORIDA', coord: [-81.25, 27.55], tamano: 64, espaciado: 0.5, opacidad: 0.55, estilo: 'pais'},
		{texto: 'Golfo de México', coord: [-84.6, 25.9], tamano: 40, espaciado: 0.14, opacidad: 0.55, estilo: 'accidente'},
		{texto: 'OCÉANO ATLÁNTICO', coord: [-70.6, 24.2], tamano: 64, espaciado: 0.6, opacidad: 0.4, estilo: 'mar'},
		{texto: 'BAHAMAS', coord: [-76.4, 24.6], tamano: 30, espaciado: 0.3, opacidad: 0.55, estilo: 'isla'},
		{texto: 'CUBA', coord: [-79.4, 21.95], tamano: 56, espaciado: 0.5, opacidad: 0.5, estilo: 'pais'},
		{texto: 'JAMAICA', coord: [-77.3, 17.75], tamano: 30, espaciado: 0.3, opacidad: 0.55, estilo: 'isla'},
		{texto: 'HAITÍ', coord: [-72.6, 19.15], tamano: 30, espaciado: 0.3, opacidad: 0.55, estilo: 'isla'},
		{texto: 'REP. DOMINICANA', coord: [-70.3, 19.0], tamano: 30, espaciado: 0.2, opacidad: 0.55, estilo: 'isla'},
		{texto: 'MAR CARIBE', coord: [-75.0, 14.6], tamano: 80, espaciado: 0.7, opacidad: 0.42, estilo: 'mar'},
		{texto: 'VENEZUELA', coord: [-69.4, 8.1], tamano: 92, espaciado: 0.55, opacidad: 0.6, estilo: 'pais'},
		{texto: 'COLOMBIA', coord: [-73.6, 6.6], tamano: 84, espaciado: 0.5, opacidad: 0.5, estilo: 'pais'},
	],
	colores: {
		rutaTerrestre: '#F2B35A',
		rutaMaritima: '#F4E7CF',
		marcadorOrigen: '#4D93C6',
		marcadorDestino: '#D8573F',
		etiqueta: '#F2B35A',
		fronteras: '#E9B970',
		texto: '#F7EEDF',
	},
	tiempos: {
		marcadorTampa: 8,
		camionInicio: 22,
		camionFin: 76,
		marcadorMiami: 72,
		alejamientoInicio: 86,
		alejamientoFin: 178,
		rutaMarInicio: 96,
		rutaMarFin: 172,
		buqueInicio: 100,
		buqueAvanceFinal: 0.62,
		marcadorDestino: 166,
	},
	camara: {
		florida: {foco: [-81.0, 26.85], pxPorGrado: 430, inclinacion: 30},
		caribe: {foco: [-74.4, 17.8], pxPorGrado: 108, inclinacion: 34},
	},
	atmosfera: {
		nubes: true,
		bruma: 0.32,
		grano: 0.05,
		vineta: 0.55,
	},
};
