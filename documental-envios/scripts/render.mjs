// Exportación individual de una composición (solo cuando la animación esté aprobada).
//
//   node scripts/render.mjs 01                     → MP4 H.264 2160×3840 24 fps
//   node scripts/render.mjs 06 --alfa              → MOV ProRes 4444 con canal alfa
//   node scripts/render.mjs 04 --props=props/04.json
//   node scripts/render.mjs 01 --borrador          → MP4 a 1/4 de resolución para revisar el movimiento
import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {buscar, navegador} from './composiciones.mjs';

const args = process.argv.slice(2);
const clave = args.find((a) => !a.startsWith('--'));
if (!clave) {
	console.error('Uso: node scripts/render.mjs <01..07> [--alfa] [--borrador] [--props=archivo.json]');
	process.exit(1);
}
const c = buscar(clave);
const alfa = args.includes('--alfa');
const borrador = args.includes('--borrador');
const archivoProps = args.find((a) => a.startsWith('--props='))?.slice(8);
const props = archivoProps ? JSON.parse(fs.readFileSync(archivoProps, 'utf8')) : {};
if (alfa) props.fondoTransparente = true;

const carpeta = path.resolve(borrador ? 'previa' : 'out');
fs.mkdirSync(carpeta, {recursive: true});
const salida = path.join(carpeta, `${c.archivo}${alfa ? '_alfa.mov' : borrador ? '_borrador.mp4' : '.mp4'}`);

const chromiumOptions = {gl: process.env.GL ?? 'angle'};
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: c.id, inputProps: props, browserExecutable: navegador(), chromiumOptions});

console.log(`Renderizando ${c.archivo} · ${composition.durationInFrames} fotogramas · ${alfa ? 'ProRes 4444 + alfa' : 'H.264'}${borrador ? ' (borrador ¼)' : ''}`);
await renderMedia({
	composition,
	serveUrl,
	inputProps: props,
	outputLocation: salida,
	browserExecutable: navegador(),
	chromiumOptions,
	imageFormat: 'png',
	scale: borrador ? 0.25 : 1,
	...(alfa
		? {codec: 'prores', proResProfile: '4444', pixelFormat: 'yuva444p10le'}
		: {codec: 'h264', crf: borrador ? 23 : 14, pixelFormat: 'yuv420p', x264Preset: borrador ? 'veryfast' : 'slow', colorSpace: 'bt709'}),
	onProgress: ({progress}) => process.stdout.write(`\r  ${(progress * 100).toFixed(0)} %`),
});
console.log(`\n✓ ${path.relative(process.cwd(), salida)}`);
