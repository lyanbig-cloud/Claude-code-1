"""Trazo guía (línea central) de una forma rellena: esqueleto + ruta más corta por waypoints
ordenados en sentido de escritura. Así se generaron los paths de src/brand/guides.ts.

uso: python3 centerline.py src/brand/paths.ts GRUPO parte "x,y;x,y!;x,y@;..." [ext0 ext1 R]
  x,y   waypoint que se ajusta al esqueleto
  x,y!  punto fijo (cruces y remates): se descarta el esqueleto a menos de R unidades
  x,y@  se une con el anterior en línea recta (sin seguir el esqueleto)
Requiere: numpy, scipy, scikit-image, pillow y node + playwright (scripts/brand/raster.js).
Salida: JSON con el path d suavizado, su largo y el grosor máximo/mediano de la forma."""
import sys,re,json,subprocess,numpy as np
from PIL import Image
from skimage.morphology import skeletonize
from skimage.graph import route_through_array
from scipy.ndimage import distance_transform_edt
import os,tempfile
HERE=os.path.dirname(os.path.abspath(__file__))
src=open(sys.argv[1]).read(); group,part,wps=sys.argv[2],sys.argv[3],sys.argv[4]
ext0=float(sys.argv[5]) if len(sys.argv)>5 else 0; ext1=float(sys.argv[6]) if len(sys.argv)>6 else 0
m=re.search(r'export const '+group+r' = \{\s*width: ([\d.]+),\s*height: ([\d.]+),\s*parts: \{(.*?)\n  \},',src,re.S)
W,H=float(m.group(1)),float(m.group(2)); parts=dict(re.findall(r'(\w+): "([^"]+)"',m.group(3)))
SC=6;PAD=20
png=os.path.join(tempfile.mkdtemp(),f'r_{group}_{part}.png')
subprocess.run(['node',os.path.join(HERE,'raster.js'),png,str(W),str(H),str(SC),'|'.join(parts[p] for p in part.split('+'))],check=True)
img=np.array(Image.open(png).convert('L'))<128
dist=distance_transform_edt(img)
sk=skeletonize(img)
cost=np.where(sk,1.0,np.where(img,25.0,1e4))
def topx(x,y): return (int(round((y+PAD)*SC)),int(round((x+PAD)*SC)))
def tou(r,c): return (c/SC-PAD, r/SC-PAD)
raw=wps.split(';')
pts=[tuple(map(float,p.rstrip('!@').split(','))) for p in raw]
straight=[p.endswith('@') for p in raw]
fixed=[(i,pts[i]) for i,p in enumerate(raw) if p.endswith('!')]
R=float(sys.argv[7]) if len(sys.argv)>7 else 12
# snap waypoints to nearest skeleton pixel
skp=np.argwhere(sk)
def snap(p):
    r,c=topx(*p); d=((skp[:,0]-r)**2+(skp[:,1]-c)**2); return tuple(skp[d.argmin()])
segs=[]
for k,(a,b) in enumerate(zip(pts[:-1],pts[1:])):
    if straight[k+1]:
        n=max(2,int(np.hypot(b[0]-a[0],b[1]-a[1])*SC)); t=np.linspace(0,1,n)[:,None]
        segs.append(np.array(a)*(1-t)+np.array(b)*t); continue
    path,_=route_through_array(cost,snap(a),snap(b),fully_connected=True,geometric=True)
    segs.append(np.array([tou(r,c) for r,c in path]))
out=[]
for i,sg in enumerate(segs):
    # waypoint i is the start of segment i
    if i==0 or any(j==i for j,_ in fixed): out.append(np.array([pts[i]]))
    keep=np.ones(len(sg),bool)
    for _,f in fixed: keep&=np.hypot(sg[:,0]-f[0],sg[:,1]-f[1])>R
    out.append(sg[keep])
out.append(np.array([pts[-1]]))
poly=np.vstack([o for o in out if len(o)])
# smooth (moving average) then resample + RDP-ish decimation
def smooth(p,k=9):
    if len(p)<k: return p
    pad=np.vstack([np.repeat(p[:1],k//2,0),p,np.repeat(p[-1:],k//2,0)])
    ker=np.ones(k)/k
    return np.stack([np.convolve(pad[:,i],ker,'valid') for i in range(2)],1)
poly=smooth(smooth(poly,9),9)
# extend ends along tangent
def extend(p,e,start):
    if e<=0: return p
    a,b=(p[0],p[min(8,len(p)-1)]) if start else (p[-1],p[-min(9,len(p))])
    v=a-b; v/=np.linalg.norm(v); q=a+v*e
    return np.vstack([q,p]) if start else np.vstack([p,q])
poly=extend(poly,ext0,True); poly=extend(poly,ext1,False)
# resample every ~4 units
seg=np.r_[0,np.cumsum(np.linalg.norm(np.diff(poly,axis=0),axis=1))]
n=max(4,int(seg[-1]/5)); t=np.linspace(0,seg[-1],n)
rs=np.stack([np.interp(t,seg,poly[:,0]),np.interp(t,seg,poly[:,1])],1)
# Catmull-Rom -> cubic bezier
P=np.vstack([rs[:1],rs,rs[-1:]])
d=f'M {rs[0][0]:.1f} {rs[0][1]:.1f}'
for i in range(1,len(P)-2):
    p0,p1,p2,p3=P[i-1],P[i],P[i+1],P[i+2]
    c1=p1+(p2-p0)/6; c2=p2-(p3-p1)/6
    d+=f' C {c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
maxw=2*dist[sk].max()/SC; medw=2*np.median(dist[sk])/SC
print(json.dumps({'d':d,'length':round(float(seg[-1]),1),'maxThickness':round(float(maxw),1),'medianThickness':round(float(medw),1)}))
