import {Easing, interpolate} from 'remotion';

// Curvas de movimiento: aceleración y desaceleración suaves, sin rebotes.
export const CURVA = {
	// Entrada/salida simétrica, para desplazamientos de cámara.
	suave: Easing.bezier(0.65, 0, 0.35, 1),
	// Desaceleración larga, para apariciones de elementos.
	salida: Easing.bezier(0.16, 1, 0.3, 1),
	// Aceleración suave, para salidas.
	entrada: Easing.bezier(0.55, 0, 0.75, 0.2),
	// Trazado de rutas: arranque y llegada suaves.
	trazo: Easing.bezier(0.45, 0.05, 0.25, 1),
} as const;

/** Progreso 0→1 entre dos fotogramas con curva. */
export const progreso = (frame: number, inicio: number, duracion: number, curva = CURVA.salida) =>
	interpolate(frame, [inicio, inicio + Math.max(1, duracion)], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: curva,
	});

/** Aparición con salida opcional: devuelve 0→1→0. */
export const visibilidad = (frame: number, entrada: number, durEntrada: number, salida?: number, durSalida = 12) => {
	const a = progreso(frame, entrada, durEntrada);
	if (salida === undefined) return a;
	return a * (1 - progreso(frame, salida, durSalida, CURVA.entrada));
};

export const mezclar = (a: number, b: number, t: number) => a + (b - a) * t;

/** Segundos → fotogramas. */
export const seg = (s: number, fps: number) => Math.round(s * fps);
