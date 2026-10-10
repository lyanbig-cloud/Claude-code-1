import {Composition} from 'remotion';
import {CalendarioEntrega} from './CalendarioEntrega';
import {defaultProps, schema} from './schema';
import './fonts';

export const Root: React.FC = () => (
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
);
