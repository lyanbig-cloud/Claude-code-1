"""Extrae los vectores del manual de marca a src/brand/paths.ts.

uso: python3 scripts/brand/extract_paths.py assets/manual.pdf src/brand/paths.ts
Convierte las páginas 11 (logos y símbolo) y 17 (brand assets) con pdftocairo -svg, toma los
paths del cuerpo de cada página y los agrupa por letra / elemento, trasladados al origen de su
grupo. No se redibuja nada: son los vectores originales del PDF.
"""
import sys, re, json, os, subprocess, tempfile
from lxml import etree
NS='{http://www.w3.org/2000/svg}'
pdf=sys.argv[1]; out=sys.argv[2]
pdfdir=tempfile.mkdtemp()
for page in (11, 17):
    subprocess.run(['pdftocairo','-svg','-f',str(page),'-l',str(page),pdf,f'{pdfdir}/p{page}.svg'],check=True)
def body_paths(f):
    root=etree.parse(f).getroot()
    return [el for el in root if el.tag==NS+'path']
NUM=re.compile(r'-?\d+\.?\d*(?:e-?\d+)?')
def bbox(d):
    n=list(map(float,NUM.findall(d))); return min(n[0::2]),min(n[1::2]),max(n[0::2]),max(n[1::2])
def shift(d,dx,dy):
    # all commands absolute M/L/C/Z with x y pairs
    toks=re.findall(r'[MLCZ]|-?\d+\.?\d*(?:e-?\d+)?',d)
    res=[];k=0
    for t in toks:
        if t in 'MLCZ': res.append(t); k=0; continue
        v=float(t)-(dx if k%2==0 else dy); k+=1
        res.append(('%.2f'%v).rstrip('0').rstrip('.'))
    return ' '.join(res)
p11=body_paths(f'{pdfdir}/p11.svg'); p17=body_paths(f'{pdfdir}/p17.svg')
groups={
 'LOGO_MAIN':(p11,{'l':4,'o':5,'v':6,'a':7,'agA':8,'agG':9,'agE':10,'agN':11,'agC':12,'agY':13}),
 'LOGO_SECONDARY':(p11,{'l':14,'o':15,'v':16,'a':17}),
 'SYMBOL':(p11,{'mark':20,'dotLeft':19,'dotRight':18}),
 'ASSET_LL':(p17,{'stroke':10,'dot':11}),
 'ASSET_HI':(p17,{'stroke':12,'dot':13}),
 'ASSET_A':(p17,{'stroke':1}),
 'FLOWER_VERTICAL':(p17,{'body':7,'dotTop':8,'dotBottom':9}),
 'FLOWER_CROSS':(p17,{'body':2,'dotTL':3,'dotTR':4,'dotBL':5,'dotBR':6}),
}
lines=['// AUTO-GENERADO desde assets/manual.pdf (págs. 11, 15 y 17) con pdftocairo -svg.',
 '// Vectores originales del manual de marca, sólo trasladados al origen de cada grupo.',
 '// No editar a mano: regenerar con `npm run extract-brand`.','',
 'export type BrandShape = {width: number; height: number; parts: Record<string, string>};','']
for name,(paths,m) in groups.items():
    bbs=[bbox(paths[i].get('d')) for i in m.values()]
    x0=min(b[0] for b in bbs); y0=min(b[1] for b in bbs); x1=max(b[2] for b in bbs); y1=max(b[3] for b in bbs)
    lines.append(f'export const {name} = {{')
    lines.append(f'  width: {x1-x0:.2f},\n  height: {y1-y0:.2f},\n  parts: {{')
    for k,i in m.items():
        lines.append(f'    {k}: {json.dumps(shift(paths[i].get("d"),x0,y0))},')
    lines.append('  },\n} satisfies BrandShape;\n')
open(out,'w').write('\n'.join(lines))
print('ok')
