// Native: a still pixel image drawn with a plain <Image> (PNG made on the fly). Many small Skia canvases
// on one screen sometimes failed to draw on Android (empty wardrobe tiles, marshmallow missing on the stump).
import React, { useMemo } from 'react';
import { Image, StyleProp, ViewStyle } from 'react-native';
import { PixelCtx } from './raster';
import { pngUri } from './png';

export function PixelStill({ ctx, width, height, cacheKey, style, maxScale = 6 }: { ctx: PixelCtx; width: number; height: number; cacheKey?: string; style?: StyleProp<ViewStyle>; maxScale?: number }) {
  const scale = Math.max(1, Math.min(maxScale, Math.ceil(Math.max(width / ctx.width, height / ctx.height))));
  const uri = useMemo(() => pngUri(ctx, scale, cacheKey), [ctx, scale, cacheKey]);
  return <Image source={{ uri }} style={[{ width, height }, style as any]} resizeMode="stretch" fadeDuration={0} />;
}
