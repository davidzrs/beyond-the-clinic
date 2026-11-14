// Web: shows a PixelCtx in a plain <canvas> scaled with image-rendering: pixelated.
import React, { useEffect, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { PixelCtx } from './raster';

type Props = { ctx: PixelCtx; tick?: number; width: number; height: number; style?: StyleProp<ViewStyle> };

export function PixelImage({ ctx, tick = 0, width, height, style }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const c = cv.getContext('2d');
    if (!c) return;
    c.putImageData(new ImageData(new Uint8ClampedArray(ctx.data), ctx.width, ctx.height), 0, 0);
  }, [ctx, tick]);
  return (
    <View style={[{ width, height }, style]} pointerEvents="none">
      {React.createElement('canvas', {
        ref,
        width: ctx.width,
        height: ctx.height,
        style: { width: '100%', height: '100%', imageRendering: 'pixelated', display: 'block' },
      })}
    </View>
  );
}
