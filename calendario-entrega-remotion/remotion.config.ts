import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setConcurrency(2);
// 3D-transformed raster layers need a real GL backend in headless Chromium.
Config.setChromiumOpenGlRenderer('angle');
