import {Composition} from 'remotion';
import {LaGuairaRutas} from './LaGuairaRutas';
import {defaultProps, schema} from './schema';
import './fonts';

export const Root: React.FC = () => (
	<Composition
		id="LaGuairaRutas"
		component={LaGuairaRutas}
		durationInFrames={168}
		fps={24}
		width={2160}
		height={3840}
		schema={schema}
		defaultProps={defaultProps}
	/>
);
