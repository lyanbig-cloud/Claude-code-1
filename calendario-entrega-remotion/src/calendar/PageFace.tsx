import {staticFile} from 'remotion';
import {CONDENSED, SANS} from '../fonts';

// Calendar page geometry (px, before camera scale).
export const CW = 1720;
export const PH = 1240;
const MARGIN_X = 70;
const HEADER_Y = 118;
const WEEKDAYS_Y = 214;
const GRID_TOP = 282;
const GRID_BOTTOM = 1186;
export const RING_COUNT = 24;

export const PAPER_TEXTURE = staticFile('papel.png');

/** Weeks of a month as rows of day numbers (null = empty cell). */
export const monthGrid = (year: number, month: number, weekStart: 0 | 1) => {
	const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
	const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const offset = (first - weekStart + 7) % 7;
	const cells: (number | null)[] = Array(offset).fill(null);
	for (let d = 1; d <= days; d++) cells.push(d);
	while (cells.length % 7) cells.push(null);
	const rows: (number | null)[][] = [];
	for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
	return rows;
};

export const ringX = (i: number) => MARGIN_X + 20 + (i * (CW - 2 * MARGIN_X - 40)) / (RING_COUNT - 1);

export type Highlight = {
	from: number;
	to: number;
	/** 0..1: how much of the window has been painted. */
	progress: number;
	/** 0..1 for each end icon. */
	startIcon: number;
	endIcon: number;
	arrow: number;
	band: string;
	accent: string;
};

const BoxIcon: React.FC<{size: number; color: string; scale: number}> = ({size, color, scale}) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 100 100"
		style={{position: 'absolute', transform: `scale(${scale})`, filter: 'drop-shadow(0 3px 4px rgba(60,20,10,0.35))'}}
	>
		<circle cx="50" cy="50" r="47" fill={color} />
		<circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="3" />
		{/* Parcel glyph */}
		<g fill="none" stroke="#FFF7EE" strokeWidth="5" strokeLinejoin="round">
			<path d="M50 27 L72 38 L72 62 L50 73 L28 62 L28 38 Z" />
			<path d="M28 38 L50 49 L72 38 M50 49 L50 73" />
			<path d="M39 32.5 L61 43.5" strokeWidth="4" />
		</g>
	</svg>
);

/** One calendar page: paper, month header, weekday row and the day grid. */
export const PageFace: React.FC<{
	year: number;
	month: number;
	monthName: string;
	weekdays: string[];
	weekStart: 0 | 1;
	showYear: boolean;
	paper: string;
	ink: string;
	accent: string;
	highlight?: Highlight;
}> = ({year, month, monthName, weekdays, weekStart, showYear, paper, ink, accent, highlight}) => {
	const rows = monthGrid(year, month, weekStart);
	const colW = (CW - 2 * MARGIN_X) / 7;
	const rowH = (GRID_BOTTOM - GRID_TOP) / rows.length;
	const labels = weekStart === 0 ? weekdays : [...weekdays.slice(1), weekdays[0]];
	const inRange = (d: number | null) => highlight && d !== null && d >= highlight.from && d <= highlight.to;
	const span = highlight ? highlight.to - highlight.from + 1 : 1;

	const cells: React.ReactNode[] = [];
	rows.forEach((row, r) =>
		row.forEach((d, c) => {
			const x = MARGIN_X + c * colW;
			const y = GRID_TOP + r * rowH;
			const hl = inRange(d);
			// Cells are painted in day order, each fading in quickly.
			const fill = hl ? Math.min(1, Math.max(0, highlight!.progress * span - (d! - highlight!.from)) * 1.0) : 0;
			const isEnd = highlight && (d === highlight.from || d === highlight.to);
			cells.push(
				<div key={`${r}-${c}`} style={{position: 'absolute', left: x, top: y, width: colW, height: rowH}}>
					{fill > 0 && (
						<div
							style={{
								position: 'absolute',
								inset: 3,
								background: highlight!.band,
								opacity: 0.42 * fill,
								mixBlendMode: 'multiply',
							}}
						/>
					)}
					{d !== null && (
						<div
							style={{
								position: 'absolute',
								left: isEnd ? 62 : 0,
								right: 0,
								top: rowH * 0.28,
								textAlign: 'center',
								fontFamily: SANS,
								fontWeight: hl && fill > 0.5 ? 600 : 500,
								fontSize: 66,
								color: hl && fill > 0.5 ? (isEnd ? accent : '#A8382B') : ink,
								opacity: 0.92,
							}}
						>
							{d}
						</div>
					)}
				</div>,
			);
		}),
	);

	// End icons and the arrow along the last highlighted row.
	const overlay: React.ReactNode[] = [];
	if (highlight) {
		const pos = (day: number) => {
			for (let r = 0; r < rows.length; r++) {
				const c = rows[r].indexOf(day);
				if (c >= 0) return {x: MARGIN_X + c * colW, y: GRID_TOP + r * rowH, r, c};
			}
			return null;
		};
		const a = pos(highlight.from);
		const b = pos(highlight.to);
		const icon = 82;
		if (a && highlight.startIcon > 0)
			overlay.push(
				<div key="ia" style={{position: 'absolute', left: a.x + 8, top: a.y + rowH * 0.28 + 33 - icon / 2, width: icon, height: icon}}>
					<BoxIcon size={icon} color={accent} scale={0.6 + 0.4 * highlight.startIcon} />
				</div>,
			);
		if (b && highlight.endIcon > 0)
			overlay.push(
				<div key="ib" style={{position: 'absolute', left: b.x + 8, top: b.y + rowH * 0.28 + 33 - icon / 2, width: icon, height: icon}}>
					<BoxIcon size={icon} color={accent} scale={0.6 + 0.4 * highlight.endIcon} />
				</div>,
			);
		if (b && highlight.arrow > 0) {
			// From the first highlighted cell of the end row to the end icon.
			const row = rows[b.r];
			const firstC = row.findIndex((d) => d !== null && d >= highlight.from);
			const x0 = MARGIN_X + firstC * colW + colW * 0.2;
			const x1 = b.x + 8;
			const y = b.y + rowH - 22;
			if (x1 - x0 > 40) {
				const xe = x0 + (x1 - x0) * highlight.arrow;
				overlay.push(
					<svg key="ar" style={{position: 'absolute', left: 0, top: 0, width: CW, height: PH, overflow: 'visible'}}>
						<line x1={x0} y1={y} x2={xe} y2={y} stroke={accent} strokeWidth={5} strokeLinecap="round" />
						<path
							d={`M${xe - 20} ${y - 12} L${xe} ${y} L${xe - 20} ${y + 12}`}
							fill="none"
							stroke={accent}
							strokeWidth={5}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>,
				);
			}
		}
	}

	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: CW, height: PH, background: paper, overflow: 'hidden'}}>
			{/* Paper fibres */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					backgroundImage: `url(${PAPER_TEXTURE})`,
					backgroundSize: '1024px 1024px',
					mixBlendMode: 'multiply',
					opacity: 0.9,
				}}
			/>
			{/* Punched holes for the binding */}
			{Array.from({length: RING_COUNT}, (_, i) => (
				<div
					key={i}
					style={{
						position: 'absolute',
						left: ringX(i) - 9,
						top: 22,
						width: 18,
						height: 26,
						borderRadius: 9,
						background: '#1A1410',
						boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.6)',
					}}
				/>
			))}
			{/* Month header */}
			<div
				style={{
					position: 'absolute',
					left: MARGIN_X,
					right: MARGIN_X,
					top: HEADER_Y,
					display: 'flex',
					justifyContent: 'space-between',
					fontFamily: CONDENSED,
					fontWeight: 600,
					fontSize: 60,
					letterSpacing: '0.16em',
					color: ink,
				}}
			>
				<span>{monthName}</span>
				{showYear && <span style={{opacity: 0.6}}>{year}</span>}
			</div>
			{/* Weekday row */}
			{labels.map((w, i) => (
				<div
					key={w + i}
					style={{
						position: 'absolute',
						left: MARGIN_X + i * colW,
						width: colW,
						top: WEEKDAYS_Y,
						textAlign: 'center',
						fontFamily: SANS,
						fontWeight: 600,
						fontSize: 44,
						letterSpacing: '0.08em',
						color: ink,
						opacity: 0.85,
					}}
				>
					{w}
				</div>
			))}
			{/* Grid lines */}
			<svg style={{position: 'absolute', left: 0, top: 0, width: CW, height: PH}}>
				<g stroke="rgba(74,60,46,0.28)" strokeWidth={2}>
					<rect x={MARGIN_X} y={WEEKDAYS_Y - 22} width={CW - 2 * MARGIN_X} height={GRID_BOTTOM - WEEKDAYS_Y + 22} fill="none" />
					<line x1={MARGIN_X} x2={CW - MARGIN_X} y1={GRID_TOP} y2={GRID_TOP} />
					{rows.slice(1).map((_, r) => (
						<line key={r} x1={MARGIN_X} x2={CW - MARGIN_X} y1={GRID_TOP + (r + 1) * rowH} y2={GRID_TOP + (r + 1) * rowH} />
					))}
					{Array.from({length: 6}, (_, c) => (
						<line key={c} x1={MARGIN_X + (c + 1) * colW} x2={MARGIN_X + (c + 1) * colW} y1={WEEKDAYS_Y - 22} y2={GRID_BOTTOM} />
					))}
				</g>
			</svg>
			{cells}
			{overlay}
			{/* Warm, slightly backlit exposure: shade on the left, sun on the right */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: 'linear-gradient(104deg, #B58757 0%, #DDBB92 42%, #EED4AE 78%, #F6DDB5 100%)',
					mixBlendMode: 'multiply',
					opacity: 0.6,
				}}
			/>
			{/* Gentle paper falloff at the edges */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					boxShadow: 'inset 0 0 60px rgba(120,80,40,0.18)',
				}}
			/>
		</div>
	);
};
