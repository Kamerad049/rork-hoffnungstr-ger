import React from 'react';
import { Image, type ImageProps, type ImageStyle } from 'expo-image';

const BLURHASH_DARK = 'L15OE8-;00of~qRjD%t700WB%MWB';
const BLURHASH_WARM = 'L26*v|-;00of~qRjIUM{00WB%MWB';

interface OptimizedImageProps extends Omit<ImageProps, 'placeholder' | 'transition' | 'cachePolicy'> {
  variant?: 'dark' | 'warm' | 'none';
  transitionDuration?: number;
}

function OptimizedImageInner({
  variant = 'dark',
  transitionDuration = 300,
  style,
  ...rest
}: OptimizedImageProps) {
  const blurhash = variant === 'none' ? undefined : variant === 'warm' ? BLURHASH_WARM : BLURHASH_DARK;

  return (
    <Image
      {...rest}
      style={style}
      placeholder={blurhash ? { blurhash } : undefined}
      transition={transitionDuration}
      cachePolicy="memory-disk"
      recyclingKey={typeof rest.source === 'object' && rest.source !== null && 'uri' in rest.source ? (rest.source as { uri: string }).uri : undefined}
    />
  );
}

export default React.memo(OptimizedImageInner);

export const OptimizedAvatar = React.memo(function OptimizedAvatar({
  uri,
  size,
  borderRadius,
  style,
}: {
  uri: string;
  size: number;
  borderRadius?: number;
  style?: ImageStyle;
}) {
  const radius = borderRadius ?? Math.round(size * 0.22);
  return (
    <OptimizedImageInner
      source={{ uri }}
      style={[{ width: size, height: size, borderRadius: radius }, style]}
      contentFit="cover"
      variant="warm"
      transitionDuration={200}
    />
  );
});
