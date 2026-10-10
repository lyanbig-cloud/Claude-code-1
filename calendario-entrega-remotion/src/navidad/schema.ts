import {z} from 'zod';
import {zColor} from '@remotion/zod-types';

// Everything editable from the Remotion Studio sidebar. Frames at 24 fps (9 s = 216).

const pagina = z.object({mes: z.number().int().min(1).max(12), anio: z.number().int()});

export const navidadSchema = z.object({
	calendario: z.object({
		/** Pages front to back: shown, turned, turned, landed on. */
		paginas: z.array(pagina).min(3),
		meses: z.array(z.string()).length(12),
		diasSemana: z.array(z.string()).length(7),
		inicioSemana: z.union([z.literal(0), z.literal(1)]),
	}),
	marcas: z.object({
		envio: z.object({pagina: z.number().int().min(0), dia: z.number().int().min(1).max(31)}),
		objetivo: z.object({pagina: z.number().int().min(0), dia: z.number().int().min(1).max(31)}),
	}),
	textos: z.object({
		mostrar: z.boolean().describe('Mostrar los textos en pantalla'),
		envio: z.string().describe('Usa \\n para el salto de línea'),
		envioDetalle: z.string().describe('Línea pequeña bajo el texto (vacía = no se muestra)'),
		objetivoEtiqueta: z.string(),
		objetivo: z.string(),
	}),
	colores: z.object({
		papel: zColor(),
		tinta: zColor(),
		domingo: zColor(),
		marcador: zColor(),
		marcadorDiscreto: zColor(),
		texto: zColor(),
		dorado: zColor(),
	}),
	tiempos: z.object({
		circuloEnvio: z.number(),
		textoEnvio: z.number(),
		salidaTextoEnvio: z.number(),
		hojaNoviembre: z.number(),
		hojaDiciembre: z.number(),
		duracionHoja: z.number(),
		acercamiento: z.number(),
		circuloObjetivo: z.number(),
		textoObjetivo: z.number(),
	}),
	camara: z.object({
		zoomObjetivo: z.number().min(1).max(2.6),
		inclinacion: z.number().min(-6).max(6),
	}),
	grano: z.number().min(0).max(0.3),
});

export type NavidadProps = z.infer<typeof navidadSchema>;

export const navidadDefaults: NavidadProps = {
	calendario: {
		paginas: [
			{mes: 10, anio: 2026},
			{mes: 11, anio: 2026},
			{mes: 12, anio: 2026},
		],
		meses: ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'],
		diasSemana: ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'],
		inicioSemana: 0,
	},
	marcas: {
		envio: {pagina: 0, dia: 31},
		objetivo: {pagina: 2, dia: 24},
	},
	textos: {
		mostrar: true,
		envio: 'FECHA RECOMENDADA\nPARA ENVIAR',
		envioDetalle: '31 DE OCTUBRE',
		objetivoEtiqueta: 'OBJETIVO',
		objetivo: 'RECIBIR ANTES\nDE NAVIDAD',
	},
	colores: {
		papel: '#F0E5CF',
		tinta: '#2E2823',
		domingo: '#B8322A',
		marcador: '#B52A22',
		marcadorDiscreto: '#9C3A2E',
		texto: '#F8EEDF',
		dorado: '#D9A55B',
	},
	tiempos: {
		circuloEnvio: 22,
		textoEnvio: 40,
		salidaTextoEnvio: 92,
		hojaNoviembre: 100,
		hojaDiciembre: 136,
		duracionHoja: 28,
		acercamiento: 160,
		circuloObjetivo: 178,
		textoObjetivo: 188,
	},
	camara: {
		zoomObjetivo: 1.6,
		inclinacion: -1.6,
	},
	grano: 0.05,
};
