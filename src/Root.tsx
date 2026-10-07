import {Composition} from 'remotion';
import {LovaTest} from './LovaTest';
import {VIDEO} from './constants';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LovaTest"
      component={LovaTest}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
      durationInFrames={VIDEO.durationInFrames}
    />
  );
};
