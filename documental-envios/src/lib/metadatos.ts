import type {CalculateMetadataFunction} from 'remotion';
import {FORMATO} from './tema';

// Cada composición expone `duracionSegundos` como parámetro editable.
export const duracionDesdeProps = <T extends {duracionSegundos: number}>(): CalculateMetadataFunction<T> => ({props}) => ({
	durationInFrames: Math.max(1, Math.round(props.duracionSegundos * FORMATO.fps)),
});
