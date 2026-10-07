import {AbsoluteFill, Sequence} from 'remotion';
import {COLORS, SCENES} from './constants';
import './fonts';
import {Scene1Trazo} from './scenes/Scene1Trazo';
import {Scene2Lineas} from './scenes/Scene2Lineas';
import {Scene3Assets} from './scenes/Scene3Assets';
import {Scene4Logo} from './scenes/Scene4Logo';

// Sin audio: no existe assets/music.mp3. Si se agrega, montar <Audio> aquí y
// alinear los golpes de T (constants.ts) con los beats del tema.

const span = (s: {from: number; to: number}) => ({from: s.from, durationInFrames: s.to - s.from});

export const LovaTest: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.tolopea}}>
      {/* Cada escena trabaja en frames absolutos (useSceneFrame): la Sequence sólo acota cuándo se monta. */}
      <Sequence {...span(SCENES.trazo)} name="1 · Trazo">
        <Scene1Trazo />
      </Sequence>
      <Sequence {...span(SCENES.lineas)} name="2 · Líneas">
        <Scene2Lineas />
      </Sequence>
      <Sequence {...span(SCENES.assets)} name="3 · Brand assets">
        <Scene3Assets />
      </Sequence>
      <Sequence {...span(SCENES.logo)} name="4 · Logo">
        <Scene4Logo />
      </Sequence>
    </AbsoluteFill>
  );
};
