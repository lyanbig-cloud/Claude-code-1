// Storyboard de revisión: renderiza fotogramas clave a baja resolución y los
// une en una hoja de contacto por composición. NO renderiza los videos.
//
//   node scripts/storyboard.mjs            → las 7 composiciones
//   node scripts/storyboard.mjs 03 06      → solo algunas
//   ESCALA=0.25 node scripts/storyboard.mjs
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {COMPOSICIONES, buscar, navegador} from './composiciones.mjs';

const ESCALA = Number(process.env.ESCALA ?? 0.2);
const MOMENTOS = [0.06, 0.22, 0.4, 0.58, 0.76, 0.95];
const SALIDA = path.resolve('previa');
fs.mkdirSync(SALIDA, {recursive: true});

const lista = process.argv.slice(2).length ? process.argv.slice(2).map(buscar) : COMPOSICIONES;
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const chromiumOptions = {gl: process.env.GL ?? 'swangle'};

for (const c of lista) {
	const comp = await selectComposition({serveUrl, id: c.id, browserExecutable: navegador(), chromiumOptions});
	const cuadros = [];
	for (const m of MOMENTOS) {
		const frame = Math.min(comp.durationInFrames - 1, Math.round(m * comp.durationInFrames));
		const out = path.join(SALIDA, `${c.archivo}_f${String(frame).padStart(4, '0')}.png`);
		await renderStill({composition: comp, serveUrl, frame, output: out, scale: ESCALA, browserExecutable: navegador(), chromiumOptions, overwrite: true});
		cuadros.push(out);
	}
	const hoja = path.join(SALIDA, `${c.archivo}_storyboard.jpg`);
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...cuadros.flatMap((f) => ['-i', f]), '-filter_complex', `${cuadros.map((_, i) => `[${i}:v]pad=iw+16:ih+16:8:8:color=0x0e0d0c[p${i}]`).join(';')};${cuadros.map((_, i) => `[p${i}]`).join('')}hstack=inputs=${cuadros.length}`, '-q:v', '3', hoja]);
	console.log(`✓ ${c.archivo}: ${comp.durationInFrames} fotogramas (${(comp.durationInFrames / comp.fps).toFixed(1)} s) → ${path.relative(process.cwd(), hoja)}`);
}
