import {z} from 'zod';
import {zColor} from '@remotion/zod-types';

// Everything a motion designer may want to tweak lives here and is editable
// from the Remotion Studio sidebar. Geography lives in geo/geography.json.

const lonLat = z.tuple([z.number(), z.number()]);
const cameraKey = z.object({
	foco: lonLat.describe('[longitud, latitud] que queda en el punto focal'),
	pxPorGrado: z.number().min(40).max(900),
	inclinacion: z.number().min(0).max(55),
});
const label = z.object({
	titulo: z.string(),
	subtitulo: z.string(),
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

export const schema = z.object({
	etiquetas: z.object({
		laGuaira: label,
		puertoCabello: label,
		zulia: label,
		interrupcion: z.string(),
		mostrarCoordenadas: z.boolean(),
	}),
	rotulosMapa: z.array(mapLabel),
	colores: z.object({
		ruta: zColor(),
		rutaInterrumpida: zColor(),
		alternativa: zColor(),
		marcadorPrincipal: zColor(),
		marcadorAlternativo: zColor(),
		fronteraVenezuela: zColor(),
		texto: zColor(),
	}),
	// All timings in frames (24 fps).
	tiempos: z.object({
		marcadorLaGuaira: z.number(),
		rutaInicio: z.number(),
		rutaFin: z.number(),
		interrupcionInicio: z.number(),
		interrupcionFin: z.number(),
		alternativaPCInicio: z.number(),
		alternativaPCFin: z.number(),
		alternativaZuliaInicio: z.number(),
		alternativaZuliaFin: z.number(),
	}),
	camara: z.object({
		inicio: cameraKey,
		laGuaira: cameraKey,
		final: cameraKey,
		acercamientoFin: z.number().describe('Frame en que termina el acercamiento a La Guaira'),
		reencuadreInicio: z.number(),
		reencuadreFin: z.number(),
	}),
	atmosfera: z.object({
		nubes: z.boolean(),
		bruma: z.number().min(0).max(1),
		grano: z.number().min(0).max(0.3),
		vineta: z.number().min(0).max(1),
	}),
});

export type Props = z.infer<typeof schema>;

export const defaultProps: Props = {
	etiquetas: {
		laGuaira: {titulo: 'LA GUAIRA', subtitulo: 'Puerto de La Guaira', lado: 'derecha', alturaMastil: 250},
		puertoCabello: {titulo: 'PUERTO CABELLO', subtitulo: 'Estado Carabobo', lado: 'izquierda', alturaMastil: 120},
		zulia: {titulo: 'ZULIA', subtitulo: 'Puerto de Maracaibo', lado: 'derecha', alturaMastil: 170},
		interrupcion: 'RUTA INTERRUMPIDA',
		mostrarCoordenadas: true,
	},
	rotulosMapa: [
		{texto: 'VENEZUELA', coord: [-67.3, 8.7], tamano: 118, espaciado: 0.55, opacidad: 0.62, estilo: 'pais'},
		{texto: 'COLOMBIA', coord: [-72.15, 11.88], tamano: 50, espaciado: 0.5, opacidad: 0.5, estilo: 'pais'},
		{texto: 'MAR CARIBE', coord: [-68.9, 14.6], tamano: 70, espaciado: 0.7, opacidad: 0.42, estilo: 'mar'},
		{texto: 'Golfo de Venezuela', coord: [-70.72, 11.42], tamano: 28, espaciado: 0.12, opacidad: 0.55, estilo: 'accidente'},
		{texto: 'Lago de Maracaibo', coord: [-71.6, 9.75], tamano: 34, espaciado: 0.12, opacidad: 0.55, estilo: 'accidente'},
		{texto: 'ARUBA', coord: [-69.97, 12.32], tamano: 28, espaciado: 0.3, opacidad: 0.55, estilo: 'isla'},
		{texto: 'CURAZAO', coord: [-69.08, 11.94], tamano: 28, espaciado: 0.3, opacidad: 0.55, estilo: 'isla'},
		{texto: 'BONAIRE', coord: [-68.47, 11.9], tamano: 28, espaciado: 0.3, opacidad: 0.55, estilo: 'isla'},
	],
	colores: {
		ruta: '#F4E7CF',
		rutaInterrumpida: '#C9533C',
		alternativa: '#F0B867',
		marcadorPrincipal: '#D8573F',
		marcadorAlternativo: '#E9A94E',
		fronteraVenezuela: '#E9B970',
		texto: '#F7EEDF',
	},
	tiempos: {
		marcadorLaGuaira: 10,
		rutaInicio: 16,
		rutaFin: 68,
		interrupcionInicio: 74,
		interrupcionFin: 92,
		alternativaPCInicio: 96,
		alternativaPCFin: 128,
		alternativaZuliaInicio: 100,
		alternativaZuliaFin: 150,
	},
	camara: {
		inicio: {foco: [-67.7, 13.6], pxPorGrado: 120, inclinacion: 36},
		laGuaira: {foco: [-67.2, 11.15], pxPorGrado: 345, inclinacion: 31},
		final: {foco: [-69.1, 11.3], pxPorGrado: 275, inclinacion: 28},
		acercamientoFin: 96,
		reencuadreInicio: 84,
		reencuadreFin: 162,
	},
	atmosfera: {
		nubes: true,
		bruma: 0.32,
		grano: 0.05,
		vineta: 0.55,
	},
};
