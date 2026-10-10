import React from 'react';
import {Composition, Folder} from 'remotion';
import {RutasMaritimas, esquemaRutasMaritimas, propsRutasMaritimas} from './compositions/01-RutasMaritimas';
import {TiempoEntrega, esquemaTiempoEntrega, propsTiempoEntrega} from './compositions/02-TiempoEntrega';
import {TampaMiamiVenezuela, esquemaTampaMiamiVenezuela, propsTampaMiamiVenezuela} from './compositions/03-TampaMiamiVenezuela';
import {CiudadesDestino, esquemaCiudadesDestino, propsCiudadesDestino} from './compositions/04-CiudadesDestino';
import {DiezAnosServicio, esquemaDiezAnos, propsDiezAnos} from './compositions/05-DiezAnosServicio';
import {DimensionesCaja, esquemaDimensionesCaja, propsDimensionesCaja} from './compositions/06-DimensionesCaja';
import {CalendarioNavidad, esquemaCalendarioNavidad, propsCalendarioNavidad} from './compositions/07-CalendarioNavidad';
import {duracionDesdeProps} from './lib/metadatos';
import {FORMATO} from './lib/tema';

// Remotion solo admite letras, números y guiones en los ID de composición,
// por eso "01_Rutas_Maritimas" se registra como "01-Rutas-Maritimas".
// Los archivos exportados sí usan el nombre con guiones bajos (ver scripts/render.mjs).
const comun = {width: FORMATO.ancho, height: FORMATO.alto, fps: FORMATO.fps, durationInFrames: 1} as const;

export const Root: React.FC = () => (
	<Folder name="Documental-Envios-Tampa-Venezuela">
		<Composition id="01-Rutas-Maritimas" component={RutasMaritimas} schema={esquemaRutasMaritimas} defaultProps={propsRutasMaritimas} calculateMetadata={duracionDesdeProps()} {...comun} />
		<Composition id="02-Tiempo-Entrega" component={TiempoEntrega} schema={esquemaTiempoEntrega} defaultProps={propsTiempoEntrega} calculateMetadata={duracionDesdeProps()} {...comun} />
		<Composition id="03-Tampa-Miami-Venezuela" component={TampaMiamiVenezuela} schema={esquemaTampaMiamiVenezuela} defaultProps={propsTampaMiamiVenezuela} calculateMetadata={duracionDesdeProps()} {...comun} />
		<Composition id="04-Ciudades-Destino" component={CiudadesDestino} schema={esquemaCiudadesDestino} defaultProps={propsCiudadesDestino} calculateMetadata={duracionDesdeProps()} {...comun} />
		<Composition id="05-Diez-Anos-Servicio" component={DiezAnosServicio} schema={esquemaDiezAnos} defaultProps={propsDiezAnos} calculateMetadata={duracionDesdeProps()} {...comun} />
		<Composition id="06-Dimensiones-Caja" component={DimensionesCaja} schema={esquemaDimensionesCaja} defaultProps={propsDimensionesCaja} calculateMetadata={duracionDesdeProps()} {...comun} />
		<Composition id="07-Calendario-Navidad" component={CalendarioNavidad} schema={esquemaCalendarioNavidad} defaultProps={propsCalendarioNavidad} calculateMetadata={duracionDesdeProps()} {...comun} />
	</Folder>
);
