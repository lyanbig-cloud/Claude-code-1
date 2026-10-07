// Rasteriza formas en negro sobre blanco (origen desplazado PAD unidades).
// Requiere playwright (npm i -g playwright). Uso: node raster.js out.png W H scale "d1|d2"
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const [out,W,H,scale,ds]=process.argv.slice(2);const PAD=20;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${(+W+2*PAD)*scale}" height="${(+H+2*PAD)*scale}"><rect width="100%" height="100%" fill="#fff"/><g transform="scale(${scale}) translate(${PAD},${PAD})">${ds.split('|').map(d=>`<path d="${d}" fill="#000"/>`).join('')}</g></svg>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);const el=await p.$('svg');await el.screenshot({path:out});await b.close();})();
