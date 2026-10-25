import { useEffect, useId, useRef, useState } from 'react';
import {
  Image,
  View,
  Pressable,
  type ImageProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, Filter, FeColorMatrix, Image as SvgImage } from 'react-native-svg';
import { LabelText } from './_core';

export type RegistryImageProps = Omit<ImageProps, 'source' | 'style' | 'width' | 'height'> & {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  grayscale?: boolean;
  brightness?: number;
  objectFit?: 'cover' | 'contain' | 'fill';
  style?: StyleProp<ViewStyle>;
};
/** Native source images keep authored URLs. Loading uses the OS image cache, not a Next server. */
export function NativeRegistryImage({
  src,
  alt,
  width,
  height,
  fill,
  grayscale = false,
  brightness = 1,
  objectFit = 'cover',
  style,
  onLoad,
  onError,
  testID,
  accessibilityLabel = alt,
  ...props
}: RegistryImageProps) {
  if (!/^https:\/\//.test(src))
    throw Error('Native registry images require an HTTPS URL or an explicitly ported local asset.');
  if (!Number.isFinite(brightness) || brightness < 0)
    throw Error('Native image brightness must be a finite nonnegative number.');
  const id = useId(),
    [retry, setRetry] = useState(0),
    identity = JSON.stringify([src, grayscale, brightness, retry]),
    latest = useRef(identity);
  latest.current = identity;
  const [loaded, setLoaded] = useState({ identity, bitmap: false, filtered: false, error: false }),
    state =
      loaded.identity === identity ? loaded : { bitmap: false, filtered: false, error: false },
    filtered = grayscale || brightness !== 1,
    ready = state.bitmap && (!filtered || state.filtered),
    mark = (key: 'bitmap' | 'filtered' | 'error') => {
      if (latest.current !== identity) return false;
      setLoaded((previous) => ({
        ...(previous.identity === identity
          ? previous
          : { identity, bitmap: false, filtered: false, error: false }),
        [key]: true,
      }));
      return true;
    };
  useEffect(() => {
    if (ready || state.error) return;
    const timer = setTimeout(() => {
      if (latest.current === identity) mark('error');
    }, 30_000);
    return () => clearTimeout(timer);
  }, [identity, ready, state.error]);
  useEffect(() => {
    latest.current = identity;
    return () => {
      if (latest.current === identity) latest.current = '';
    };
  }, [identity]);
  const imageStyle = { position: 'absolute' as const, inset: 0 },
    base = grayscale ? [0.2126, 0.7152, 0.0722] : undefined,
    matrix = [
      ...(base ?? [1, 0, 0]).map((value) => value * brightness),
      0,
      0,
      ...(base ?? [0, 1, 0]).map((value) => value * brightness),
      0,
      0,
      ...(base ?? [0, 0, 1]).map((value) => value * brightness),
      0,
      0,
      0,
      0,
      0,
      1,
      0,
    ];
  return (
    <View
      testID={testID}
      style={[
        { overflow: 'hidden', width, height },
        fill && { position: 'absolute' as const, inset: 0 },
        style,
      ]}
    >
      <Image
        {...props}
        key={identity}
        testID={testID ? testID + '-bitmap' : undefined}
        source={{ uri: src }}
        accessible={!filtered && !!accessibilityLabel && ready && !state.error}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        accessibilityElementsHidden={filtered || !ready || state.error}
        importantForAccessibility={
          filtered || !ready || state.error ? 'no-hide-descendants' : 'auto'
        }
        resizeMode={objectFit === 'fill' ? 'stretch' : objectFit}
        onLoad={(event) => {
          if (mark('bitmap')) onLoad?.(event);
        }}
        onError={(event) => {
          if (mark('error')) onError?.(event);
        }}
        style={[imageStyle, { opacity: ready && !filtered && !state.error ? 1 : 0 }]}
      />
      {filtered && (
        <Svg
          width="100%"
          height="100%"
          testID={testID ? testID + '-filtered' : undefined}
          accessible={!!accessibilityLabel && ready && !state.error}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="image"
          accessibilityElementsHidden={!ready || state.error}
          style={[imageStyle, { opacity: ready && !state.error ? 1 : 0 }]}
        >
          <Defs>
            <Filter id={id}>
              <FeColorMatrix type="matrix" values={matrix} />
            </Filter>
          </Defs>
          <SvgImage
            key={identity}
            testID={testID ? testID + '-svg-source' : undefined}
            href={src}
            width="100%"
            height="100%"
            onLoad={() => mark('filtered')}
            preserveAspectRatio={
              objectFit === 'fill'
                ? 'none'
                : objectFit === 'contain'
                  ? 'xMidYMid meet'
                  : 'xMidYMid slice'
            }
            filter={'url(#' + id + ')'}
          />
        </Svg>
      )}
      {!ready && !state.error && (
        <LabelText
          accessibilityRole="progressbar"
          accessibilityLabel={
            accessibilityLabel ? 'Loading ' + accessibilityLabel : 'Loading image'
          }
        >
          Loading image…
        </LabelText>
      )}
      {state.error && (
        <View>
          <LabelText accessibilityRole="alert">
            {accessibilityLabel ? 'Unable to load ' + accessibilityLabel : 'Unable to load image'}
          </LabelText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry image"
            onPress={() => setRetry((value) => value + 1)}
          >
            <LabelText>Retry image</LabelText>
          </Pressable>
        </View>
      )}
    </View>
  );
}
NativeRegistryImage.nativeRegistryImage = true;

NativeRegistryImage.nativeRegistryMedia = true;
