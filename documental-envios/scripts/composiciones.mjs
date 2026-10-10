// Mapa de composiciones: ID en Remotion → nombre de archivo de exportación.
export const COMPOSICIONES = [
	{id: '01-Rutas-Maritimas', archivo: '01_Rutas_Maritimas'},
	{id: '02-Tiempo-Entrega', archivo: '02_Tiempo_Entrega'},
	{id: '03-Tampa-Miami-Venezuela', archivo: '03_Tampa_Miami_Venezuela'},
	{id: '04-Ciudades-Destino', archivo: '04_Ciudades_Destino'},
	{id: '05-Diez-Anos-Servicio', archivo: '05_Diez_Anos_Servicio'},
	{id: '06-Dimensiones-Caja', archivo: '06_Dimensiones_Caja'},
	{id: '07-Calendario-Navidad', archivo: '07_Calendario_Navidad'},
];

export const buscar = (clave) => {
	const c = COMPOSICIONES.find((x) => x.id === clave || x.archivo === clave || x.id.startsWith(`${clave}-`) || x.archivo.startsWith(`${clave}_`));
	if (!c) throw new Error(`Composición desconocida: ${clave}. Opciones: ${COMPOSICIONES.map((x) => x.archivo).join(', ')}`);
	return c;
};

// Navegador: usa CHROME_EXECUTABLE si está definido (p. ej. entornos sin descarga de Chrome).
export const navegador = () => process.env.CHROME_EXECUTABLE || undefined;
