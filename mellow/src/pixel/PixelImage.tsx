// Native (Android/iOS): shows a PixelCtx through Skia with nearest-neighbour scaling,
// so every art pixel stays a crisp square.
import React, { useMemo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { AlphaType, Canvas, ColorType, FilterMode, Image, MipmapMode, Skia } from '@shopify/react-native-skia';
import { PixelCtx } from './raster';

type Props = { ctx: PixelCtx; tick?: number; width: number; height: number; style?: StyleProp<ViewStyle> };

export function PixelImage({ ctx, tick = 0, width, height, style }: Props) {
  const img = useMemo(() => {
    const bytes = new Uint8Array(ctx.data.length);
    bytes.set(ctx.data);
    const data = Skia.Data.fromBytes(bytes);
    return Skia.Image.MakeImage(
      { width: ctx.width, height: ctx.height, alphaType: AlphaType.Unpremul, colorType: ColorType.RGBA_8888 },
      data,
      ctx.width * 4,
    );
  }, [ctx, tick]);
  return (
    <Canvas style={[{ width, height }, style]} pointerEvents="none">
      {img && (
        <Image
          image={img}
          x={0}
          y={0}
          width={width}
          height={height}
          fit="fill"
          sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
        />
      )}
    </Canvas>
  );
}
