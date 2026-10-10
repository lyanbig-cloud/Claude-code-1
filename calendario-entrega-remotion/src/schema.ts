import {z} from 'zod';
import {zColor} from '@remotion/zod-types';

// Every number and text in the piece is editable here (Remotion Studio sidebar).

const pagina = z.object({
	mes: z.number().int().min(1).max(12),
	anio: z.number().int(),
});

export const schema = z.object({
	textos: z.object({
		titulo: z.string(),
		subtitulo: z.string(),
	}),
	calendario: z.object({
		/** Pages from front (first shown) to back (where it lands). */
		paginas: z.array(pagina).min(2),
		/** Highlighted delivery window on the last page (day numbers). */
		rangoInicio: z.number().int().min(1).max(31),
		rangoFin: z.number().int().min(1).max(31),
		meses: z.array(z.string()).length(12),
		diasSemana: z.array(z.string()).length(7),
		/** 0 = week starts on Sunday, 1 = Monday. */
		inicioSemana: z.union([z.literal(0), z.literal(1)]),
		mostrarAnio: z.boolean(),
	}),
	colores: z.object({
		papel: zColor(),
		tinta: zColor(),
		acento: zColor(),
		rango: zColor(),
		titulo: zColor(),
	}),
	// Frames at 24 fps.
	tiempos: z.object({
		primeraHoja: z.number(),
		intervaloHojas: z.number(),
		duracionHoja: z.number(),
		rangoInicio: z.number(),
		rangoFin: z.number(),
		titulo: z.number(),
		subtitulo: z.number(),
	}),
	camara: z.object({
		acercamiento: z.number().min(1).max(1.4),
		inclinacion: z.number().min(-8).max(8),
	}),
	grano: z.number().min(0).max(0.3),
});

export type Props = z.infer<typeof schema>;

export const defaultProps: Props = {
	textos: {
		titulo: '6–10 SEMANAS',
		subtitulo: 'TIEMPO ESTIMADO DE ENTREGA',
	},
	calendario: {
		paginas: [
			{mes: 9, anio: 2026},
			{mes: 10, anio: 2026},
			{mes: 11, anio: 2026},
			{mes: 12, anio: 2026},
		],
		rangoInicio: 3,
		rangoFin: 31,
		meses: [
			'ENERO',
			'FEBRERO',
			'MARZO',
			'ABRIL',
			'MAYO',
			'JUNIO',
			'JULIO',
			'AGOSTO',
			'SEPTIEMBRE',
			'OCTUBRE',
			'NOVIEMBRE',
			'DICIEMBRE',
		],
		diasSemana: ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'],
		inicioSemana: 0,
		mostrarAnio: true,
	},
	colores: {
		papel: '#F2E9DA',
		tinta: '#4A433C',
		acento: '#C23A2C',
		rango: '#E58C78',
		titulo: '#F8EEE0',
	},
	tiempos: {
		primeraHoja: 10,
		intervaloHojas: 13,
		duracionHoja: 19,
		rangoInicio: 56,
		rangoFin: 80,
		titulo: 72,
		subtitulo: 86,
	},
	camara: {
		acercamiento: 1.1,
		inclinacion: -2.2,
	},
	grano: 0.06,
};
