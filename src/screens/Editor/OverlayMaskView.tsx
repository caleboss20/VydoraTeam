/**
 * CapCut-style luminance mask wrapper for overlay media.
 * White = visible, black = cut out. Soft gradients approximate feather.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Rect,
  Circle,
  Path,
  G,
} from 'react-native-svg';
import MaskedView from '@react-native-masked-view/masked-view';
import type { OverlayMask, OverlayMaskShape } from '../types';
import { ensureMask, sampleMaskTransform } from '../services/maskPresets';

type Props = {
  width: number;
  height: number;
  mask?: OverlayMask | null;
  timelineMs?: number;
  children: React.ReactNode;
};

function heartPath(cx: number, cy: number, s: number): string {
  // Scaled classic heart around center.
  const w = s * 0.92;
  const h = s * 0.85;
  return [
    `M ${cx} ${cy + h * 0.3}`,
    `C ${cx} ${cy + h * 0.05}, ${cx - w * 0.5} ${cy - h * 0.35}, ${cx - w * 0.5} ${cy - h * 0.05}`,
    `C ${cx - w * 0.5} ${cy + h * 0.2}, ${cx} ${cy + h * 0.45}, ${cx} ${cy + h * 0.7}`,
    `C ${cx} ${cy + h * 0.45}, ${cx + w * 0.5} ${cy + h * 0.2}, ${cx + w * 0.5} ${cy - h * 0.05}`,
    `C ${cx + w * 0.5} ${cy - h * 0.35}, ${cx} ${cy + h * 0.05}, ${cx} ${cy + h * 0.3}`,
    'Z',
  ].join(' ');
}

function starPath(cx: number, cy: number, outer: number): string {
  const spikes = 5;
  const inner = outer * 0.42;
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    pts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  }
  return pts.join(' ') + ' Z';
}

function MaskGraphic({
  width,
  height,
  shape,
  feather,
  invert,
  centerX,
  centerY,
  scale,
  rotation,
}: {
  width: number;
  height: number;
  shape: OverlayMaskShape;
  feather: number;
  invert: boolean;
  centerX: number;
  centerY: number;
  scale: number;
  rotation: number;
}) {
  const cx = centerX * width;
  const cy = centerY * height;
  const minDim = Math.min(width, height);
  const size = Math.max(8, minDim * Math.max(0.15, Math.min(1.6, scale)) * 0.5);
  const f = Math.max(0, Math.min(1, feather));
  // Soft stop positions for gradient feather.
  const hard = Math.max(0.05, 1 - f * 0.85);
  const soft = 1;

  const fillVisible = invert ? 'black' : 'white';
  const fillHidden = invert ? 'white' : 'black';

  const rotated = (node: React.ReactNode) => (
    <G originX={cx} originY={cy} rotation={rotation}>
      {node}
    </G>
  );

  if (shape === 'none') {
    return <Rect x={0} y={0} width={width} height={height} fill="white" />;
  }

  if (shape === 'circle') {
    const r = size;
    const gid = 'maskCirc';
    return (
      <>
        <Defs>
          <RadialGradient id={gid} cx={cx} cy={cy} rx={r} ry={r} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={fillVisible} stopOpacity="1" />
            <Stop offset={String(hard)} stopColor={fillVisible} stopOpacity="1" />
            <Stop offset={String(soft)} stopColor={fillVisible} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={fillHidden} />
        <Circle cx={cx} cy={cy} r={r} fill={f > 0.02 ? `url(#${gid})` : fillVisible} />
      </>
    );
  }

  if (shape === 'radial') {
    const r = size * 1.15;
    const gid = 'maskRad';
    return (
      <>
        <Defs>
          <RadialGradient id={gid} cx={cx} cy={cy} rx={r} ry={r} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={fillVisible} stopOpacity="1" />
            <Stop offset="0.45" stopColor={fillVisible} stopOpacity={String(1 - f * 0.3)} />
            <Stop offset="1" stopColor={fillVisible} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={fillHidden} />
        <Circle cx={cx} cy={cy} r={r} fill={`url(#${gid})`} />
      </>
    );
  }

  if (shape === 'rectangle') {
    const rw = size * 1.55;
    const rh = size * 1.15;
    return (
      <>
        <Rect x={0} y={0} width={width} height={height} fill={fillHidden} />
        {rotated(
          <Rect
            x={cx - rw}
            y={cy - rh}
            width={rw * 2}
            height={rh * 2}
            rx={Math.max(2, f * 28)}
            fill={fillVisible}
            opacity={1}
          />
        )}
      </>
    );
  }

  if (shape === 'linear' || shape === 'linearH') {
    const vertical = shape === 'linear';
    const gid = 'maskLin';
    const edge = 0.5 + (scale - 1) * 0.25;
    return (
      <>
        <Defs>
          <LinearGradient
            id={gid}
            x1={vertical ? '0' : '0'}
            y1={vertical ? '0' : '0'}
            x2={vertical ? '0' : '1'}
            y2={vertical ? '1' : '0'}
          >
            <Stop offset="0" stopColor={fillVisible} stopOpacity="1" />
            <Stop
              offset={String(Math.max(0.05, edge - f * 0.35))}
              stopColor={fillVisible}
              stopOpacity="1"
            />
            <Stop
              offset={String(Math.min(0.95, edge + f * 0.35))}
              stopColor={fillVisible}
              stopOpacity="0"
            />
            <Stop offset="1" stopColor={fillVisible} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${gid})`} />
      </>
    );
  }

  if (shape === 'splitLR') {
    return (
      <>
        <Rect x={0} y={0} width={width} height={height} fill={fillHidden} />
        <Rect
          x={0}
          y={0}
          width={width * (0.5 + f * 0.02)}
          height={height}
          fill={fillVisible}
        />
      </>
    );
  }

  if (shape === 'splitTB') {
    return (
      <>
        <Rect x={0} y={0} width={width} height={height} fill={fillHidden} />
        <Rect
          x={0}
          y={0}
          width={width}
          height={height * (0.5 + f * 0.02)}
          fill={fillVisible}
        />
      </>
    );
  }

  if (shape === 'splitDiag') {
    const gid = 'maskDiag';
    return (
      <>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={fillVisible} stopOpacity="1" />
            <Stop offset={String(0.45 - f * 0.2)} stopColor={fillVisible} stopOpacity="1" />
            <Stop offset={String(0.55 + f * 0.2)} stopColor={fillVisible} stopOpacity="0" />
            <Stop offset="1" stopColor={fillVisible} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${gid})`} />
      </>
    );
  }

  if (shape === 'heart') {
    return (
      <>
        <Rect x={0} y={0} width={width} height={height} fill={fillHidden} />
        {rotated(
          <Path d={heartPath(cx, cy - size * 0.05, size)} fill={fillVisible} />
        )}
      </>
    );
  }

  if (shape === 'star') {
    return (
      <>
        <Rect x={0} y={0} width={width} height={height} fill={fillHidden} />
        {rotated(<Path d={starPath(cx, cy, size)} fill={fillVisible} />)}
      </>
    );
  }

  return <Rect x={0} y={0} width={width} height={height} fill="white" />;
}

export default function OverlayMaskView({
  width,
  height,
  mask: rawMask,
  timelineMs = 0,
  children,
}: Props) {
  const mask = ensureMask(rawMask);
  const active = mask.enabled && mask.shape !== 'none';
  const sampled = useMemo(
    () => sampleMaskTransform(mask, timelineMs),
    [mask, timelineMs]
  );

  if (!active || width <= 0 || height <= 0) {
    return <View style={{ width, height, overflow: 'hidden' }}>{children}</View>;
  }

  const maskElement = (
    <View style={[styles.maskRoot, { width, height }]}>
      <Svg width={width} height={height}>
        <MaskGraphic
          width={width}
          height={height}
          shape={mask.shape}
          feather={mask.feather}
          invert={mask.invert}
          centerX={sampled.centerX}
          centerY={sampled.centerY}
          scale={sampled.scale}
          rotation={sampled.rotation}
        />
      </Svg>
    </View>
  );

  return (
    <MaskedView style={{ width, height }} maskElement={maskElement}>
      <View style={{ width, height, overflow: 'hidden' }}>{children}</View>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  maskRoot: {
    backgroundColor: 'transparent',
  },
});
