import {Composition} from 'remotion';
import {CalendarioEntrega} from './CalendarioEntrega';
import {defaultProps, schema} from './schema';
import {CalendarioNavidad} from './navidad/CalendarioNavidad';
import {navidadDefaults, navidadSchema} from './navidad/schema';
import './fonts';

export const Root: React.FC = () => (
	<>
	<Composition
		id="CalendarioEntrega"
		component={CalendarioEntrega}
		durationInFrames={120}
		fps={24}
		width={2160}
		height={3840}
		schema={schema}
		defaultProps={defaultProps}
	/>
	<Composition
		id="CalendarioNavidad"
		component={CalendarioNavidad}
		durationInFrames={216}
		fps={24}
		width={2160}
		height={3840}
		schema={navidadSchema}
		defaultProps={navidadDefaults}
	/>
	</>
);
