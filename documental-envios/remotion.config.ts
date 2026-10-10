import {Config} from '@remotion/cli/config';

// PNG sin pérdidas por fotograma: máxima calidad antes de codificar.
Config.setVideoImageFormat('png');
// WebGL para la composición 3D (06). En máquinas sin GPU usar --gl=swangle.
Config.setChromiumOpenGlRenderer('angle');
Config.setConcurrency(null);
