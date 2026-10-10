import {CW, PAPER_TEXTURE, PH, RING_COUNT, monthGrid, ringX} from '../calendar/PageFace';
import {SANS} from '../fonts';

// Layout of a month page (page px, before camera).
const MX = 78;
const HEADER_Y = 92;
const WEEK_Y = 236;
const GRID_TOP = 300;
const GRID_BOTTOM = 1176;

export type Marca = {
	dia: number;
	/** 0..1 drawing progress of the hand-drawn circle. */
	progreso: number;
	color: string;
	grosor: number;
	opacidad: number;
	semilla: number;
};

/** Centre of a day's number on the page, in page px. */
export const dayCentre = (year: number, month: number, weekStart: 0 | 1, day: number): [number, number] | null => {
	const rows = monthGrid(year, month, weekStart);
	const colW = (CW - 2 * MX) / 7;
	const rowH = (GRID_BOTTOM - GRID_TOP) / rows.length;
	for (let r = 0; r < rows.length; r++) {
		const c = rows[r].indexOf(day);
		if (c >= 0) return [MX + (c + 0.5) * colW, GRID_TOP + r * rowH + rowH * 0.47];
	}
	return null;
};

/** A marker circle as drawn by hand: slightly irregular, ends past its start. */
const handCircle = (cx: number, cy: number, rx: number, ry: number, seed: number) => {
	const pts: string[] = [];
	const turns = 1.12;
	const n = 90;
	const start = -2.2 + seed * 0.7;
	for (let i = 0; i <= n; i++) {
		const t = i / n;
		const a = start + t * turns * Math.PI * 2;
		const wobble = 1 + 0.035 * Math.sin(3 * a + seed * 5) + 0.02 * Math.sin(7 * a + seed);
		const drift = 1 + 0.06 * t; // the stroke spirals out a little as it closes
		pts.push(`${(cx + Math.cos(a) * rx * wobble * drift).toFixed(1)} ${(cy + Math.sin(a) * ry * wobble * drift).toFixed(1)}`);
	}
	return 'M' + pts.join(' L');
};

/** A month page in the style of the reference: aged paper, centred bold month, red Sundays. */
export const PaginaNavidad: React.FC<{
	year: number;
	month: number;
	monthName: string;
	weekdays: string[];
	weekStart: 0 | 1;
	paper: string;
	ink: string;
	sunday: string;
	marcas?: Marca[];
}> = ({year, month, monthName, weekdays, weekStart, paper, ink, sunday, marcas = []}) => {
	const rows = monthGrid(year, month, weekStart);
	const colW = (CW - 2 * MX) / 7;
	const rowH = (GRID_BOTTOM - GRID_TOP) / rows.length;
	const labels = weekStart === 0 ? weekdays : [...weekdays.slice(1), weekdays[0]];
	const sundayCol = weekStart === 0 ? 0 : 6;

	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: CW, height: PH, background: paper, overflow: 'hidden'}}>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					backgroundImage: `url(${PAPER_TEXTURE})`,
					backgroundSize: '1024px 1024px',
					mixBlendMode: 'multiply',
				}}
			/>
			{/* Age: warm foxing and slightly darker, worn edges */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background:
						'radial-gradient(ellipse 30% 22% at 82% 18%, rgba(170,120,60,0.10), rgba(0,0,0,0) 70%), radial-gradient(ellipse 26% 20% at 14% 80%, rgba(160,110,55,0.09), rgba(0,0,0,0) 70%), radial-gradient(ellipse 90% 85% at 50% 50%, rgba(0,0,0,0) 60%, rgba(140,95,45,0.22) 100%)',
					mixBlendMode: 'multiply',
				}}
			/>
			{Array.from({length: RING_COUNT}, (_, i) => (
				<div
					key={i}
					style={{position: 'absolute', left: ringX(i) - 9, top: 22, width: 18, height: 26, borderRadius: 9, background: '#1A1410'}}
				/>
			))}
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: HEADER_Y,
					textAlign: 'center',
					fontFamily: SANS,
					fontWeight: 600,
					fontSize: 104,
					letterSpacing: '0.04em',
					color: ink,
				}}
			>
				{monthName}
			</div>
			{labels.map((w, i) => (
				<div
					key={w + i}
					style={{
						position: 'absolute',
						left: MX + i * colW,
						width: colW,
						top: WEEK_Y,
						textAlign: 'center',
						fontFamily: SANS,
						fontWeight: 500,
						fontSize: 36,
						letterSpacing: '0.06em',
						color: i === sundayCol ? sunday : ink,
						opacity: 0.8,
					}}
				>
					{w}
				</div>
			))}
			<svg style={{position: 'absolute', left: 0, top: 0, width: CW, height: PH}}>
				<g stroke="rgba(74,60,46,0.3)" strokeWidth={2}>
					<line x1={MX} x2={CW - MX} y1={WEEK_Y - 12} y2={WEEK_Y - 12} />
					{rows.map((_, r) => (
						<line key={r} x1={MX} x2={CW - MX} y1={GRID_TOP + r * rowH} y2={GRID_TOP + r * rowH} />
					))}
					<line x1={MX} x2={CW - MX} y1={GRID_BOTTOM} y2={GRID_BOTTOM} />
					{Array.from({length: 6}, (_, c) => (
						<line key={c} x1={MX + (c + 1) * colW} x2={MX + (c + 1) * colW} y1={GRID_TOP} y2={GRID_BOTTOM} />
					))}
				</g>
			</svg>
			{rows.map((row, r) =>
				row.map((d, c) =>
					d === null ? null : (
						<div
							key={`${r}-${c}`}
							style={{
								position: 'absolute',
								left: MX + c * colW,
								width: colW,
								top: GRID_TOP + r * rowH + rowH * 0.47 - 40,
								textAlign: 'center',
								fontFamily: SANS,
								fontWeight: 500,
								fontSize: 66,
								lineHeight: '80px',
								color: c === sundayCol ? sunday : ink,
								opacity: 0.93,
							}}
						>
							{d}
						</div>
					),
				),
			)}
			{/* Marker circles: ink sits in the paper (multiply) */}
			<svg style={{position: 'absolute', left: 0, top: 0, width: CW, height: PH, overflow: 'visible', mixBlendMode: 'multiply'}}>
				{marcas.map((m, i) => {
					const c = dayCentre(year, month, weekStart, m.dia);
					if (!c || m.progreso <= 0) return null;
					return (
						<path
							key={i}
							d={handCircle(c[0], c[1], colW * 0.36, rowH * 0.38, m.semilla)}
							pathLength={1}
							strokeDasharray={`${m.progreso} 1`}
							fill="none"
							stroke={m.color}
							strokeWidth={m.grosor}
							strokeLinecap="round"
							strokeLinejoin="round"
							opacity={m.opacidad}
						/>
					);
				})}
			</svg>
		</div>
	);
};
