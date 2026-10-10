import {z} from 'zod';
import {zColor} from '@remotion/zod-types';

// Everything here is editable from the Remotion Studio sidebar.
// Coordinates are in pixels of the original photo (941 x 1671); the
// composition scales them to the 2160 x 3840 frame, so graphics stay
// registered to the box whatever the output size.

const pt = z.tuple([z.number(), z.number()]);
const measure = z.object({
	texto: z.string(),
	/** Arrow tip at the start of the drawing and at its end. */
	desde: pt,
	hasta: pt,
	/** Extension (witness) lines: [from, to] pairs drawn dashed. */
	extensiones: z.array(z.tuple([pt, pt])),
	/** Distance of the label from the line, perpendicular, in photo px (sign picks the side). */
	separacionTexto: z.number(),
	inicio: z.number().describe('Frame en que empieza a dibujarse'),
});

export const schema = z.object({
	medidas: z.object({
		ancho: measure,
		alto: measure,
		profundidad: measure,
	}),
	textos: z.object({
		titulo: z.string().describe('Usa \\n para elegir el salto de línea'),
		subtitulo: z.string(),
		mostrarTitulo: z.boolean().describe('Título y subtítulo finales'),
		mostrarEtiquetas: z.boolean().describe('ANCHO / ALTO / PROFUNDIDAD'),
	}),
	colores: z.object({
		linea: zColor(),
		dorado: zColor(),
		titulo: zColor(),
	}),
	tiempos: z.object({
		duracionLinea: z.number(),
		titulo: z.number(),
		subtitulo: z.number(),
	}),
	camara: z.object({
		acercamiento: z.number().min(1).max(1.3),
	}),
	grano: z.number().min(0).max(0.3),
});

export type Props = z.infer<typeof schema>;

export const defaultProps: Props = {
	medidas: {
		ancho: {
			texto: 'ANCHO',
			desde: [339, 1192],
			hasta: [802, 1087],
			extensiones: [
				[[333, 1166], [333, 1218]],
				[[803, 1064], [803, 1112]],
			],
			separacionTexto: 30,
			inicio: 14,
		},
		alto: {
			texto: 'ALTO',
			desde: [842, 1061],
			hasta: [842, 630],
			extensiones: [
				[[812, 1063], [866, 1063]],
				[[812, 627], [866, 627]],
			],
			separacionTexto: 26,
			inicio: 40,
		},
		profundidad: {
			texto: 'PROFUNDIDAD',
			desde: [316, 1183],
			hasta: [97, 1024],
			extensiones: [
				[[317, 1170], [317, 1216]],
				[[95, 1010], [95, 1050]],
			],
			separacionTexto: 30,
			inicio: 66,
		},
	},
	textos: {
		titulo: 'EL TAMAÑO Y EL DESTINO\nDETERMINAN LA TARIFA',
		subtitulo: 'NO EL PESO',
		mostrarTitulo: true,
		mostrarEtiquetas: true,
	},
	colores: {
		linea: '#F7ECDC',
		dorado: '#D9A55B',
		titulo: '#F7EEDF',
	},
	tiempos: {
		duracionLinea: 26,
		titulo: 106,
		subtitulo: 128,
	},
	camara: {
		acercamiento: 1.05,
	},
	grano: 0.05,
};
