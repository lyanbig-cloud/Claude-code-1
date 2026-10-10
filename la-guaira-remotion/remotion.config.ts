import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
// One tab at a time: the large z8 mosaic (41 MP) fails to decode when two tabs load it at once.
Config.setConcurrency(1);
// 3D-transformed raster layers need a real GL backend in headless Chromium.
Config.setChromiumOpenGlRenderer('angle');
