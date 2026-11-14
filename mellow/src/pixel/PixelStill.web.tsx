// Web: the canvas version already renders crisply.
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { PixelCtx } from './raster';
import { PixelImage } from './PixelImage';

export function PixelStill({ ctx, width, height, style }: { ctx: PixelCtx; width: number; height: number; cacheKey?: string; style?: StyleProp<ViewStyle>; maxScale?: number }) {
  return <PixelImage ctx={ctx} width={width} height={height} style={style} />;
}
