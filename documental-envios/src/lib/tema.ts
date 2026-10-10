// Dirección de arte: paleta, tipografía y formato del documental.

export const FORMATO = {
	ancho: 2160,
	alto: 3840,
	fps: 24,
} as const;

export const COLOR = {
	carbon: '#0e0d0c',
	carbonClaro: '#1a1816',
	marronOscuro: '#2b1f17',
	marron: '#4a3426',
	ambar: '#d08a2e',
	ambarClaro: '#e6a94f',
	dorado: '#d9b76e',
	doradoSuave: '#e8d3a2',
	beige: '#e9dcc4',
	beigeTenue: 'rgba(233, 220, 196, 0.62)',
	oceano: '#123a40',
	oceanoProfundo: '#0b2a30',
	oceanoAbismo: '#08202a',
	tierra: '#3a2c21',
	tierraClara: '#4b3828',
	costa: '#c8a978',
} as const;

export const FUENTE = {
	titulo: '"Cormorant Garamond", Georgia, serif',
	etiqueta: '"Barlow Condensed", "Arial Narrow", sans-serif',
	texto: 'Barlow, Arial, sans-serif',
} as const;

// Márgenes seguros para 9:16 (interfaz de redes en la parte superior e inferior).
export const SEGURO = {
	lateral: 160,
	superior: 420,
	inferior: 640,
} as const;
