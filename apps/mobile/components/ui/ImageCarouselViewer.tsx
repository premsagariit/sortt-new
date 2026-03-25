import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Image,
  Text,
} from 'react-native';
import { X } from 'phosphor-react-native';

import { colors, spacing, radius } from '../../constants/tokens';

interface ImageCarouselViewerProps {
  images: string[];
  height?: number;
  autoScrollIntervalMs?: number;
}

export function ImageCarouselViewer({
  images,
  height = 220,
  autoScrollIntervalMs = 4000,
}: ImageCarouselViewerProps) {
  const listRef = React.useRef<FlatList<string>>(null);
  const fullscreenListRef = React.useRef<FlatList<string>>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [carouselWidth, setCarouselWidth] = React.useState(0);
  const [fullscreenVisible, setFullscreenVisible] = React.useState(false);
  const [fullscreenIndex, setFullscreenIndex] = React.useState(0);

  const hasMultiple = images.length > 1;

  React.useEffect(() => {
    if (!hasMultiple || carouselWidth <= 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % images.length;
        listRef.current?.scrollToOffset({ offset: next * carouselWidth, animated: true });
        return next;
      });
    }, Math.max(3000, Math.min(5000, autoScrollIntervalMs)));

    return () => clearInterval(timer);
  }, [hasMultiple, carouselWidth, images.length, autoScrollIntervalMs]);

  const onScrollEnd = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (carouselWidth <= 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
    setCurrentIndex(index);
  }, [carouselWidth]);

  const openFullscreen = React.useCallback((index: number) => {
    setFullscreenIndex(index);
    setFullscreenVisible(true);
  }, []);

  React.useEffect(() => {
    if (!fullscreenVisible) return;
    const width = Dimensions.get('window').width;
    const timeout = setTimeout(() => {
      fullscreenListRef.current?.scrollToOffset({ offset: fullscreenIndex * width, animated: false });
    }, 0);

    return () => clearTimeout(timeout);
  }, [fullscreenVisible, fullscreenIndex]);

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <View
        style={[styles.carouselWrap, { height }]}
        onLayout={(event) => setCarouselWidth(event.nativeEvent.layout.width)}
      >
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(item, index) => `${item}-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          renderItem={({ item, index }) => (
            <Pressable onPress={() => openFullscreen(index)} style={{ width: carouselWidth || '100%', height }}>
              <Image source={{ uri: item }} style={[styles.image, { height }]} resizeMode="cover" />
            </Pressable>
          )}
        />
      </View>

      {hasMultiple && (
        <View style={styles.dotsRow}>
          {images.map((_, idx) => (
            <View
              key={`dot-${idx}`}
              style={[
                styles.dot,
                idx === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}

      <Modal
        visible={fullscreenVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setFullscreenVisible(false)}
      >
        <View style={styles.fullscreenContainer}>
          <View style={styles.fullscreenCountBadge}>
            <View style={styles.fullscreenCountBadgeInner}>
              <Text style={styles.fullscreenCountText}>{fullscreenIndex + 1}/{images.length}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => setFullscreenVisible(false)}
            style={styles.closeButton}
            hitSlop={10}
          >
            <X size={24} color={colors.surface} weight="bold" />
          </Pressable>

          <FlatList
            ref={fullscreenListRef}
            data={images}
            keyExtractor={(item, index) => `fullscreen-${item}-${index}`}
            horizontal
            pagingEnabled
            initialScrollIndex={fullscreenIndex}
            getItemLayout={(_, index) => {
              const width = Dimensions.get('window').width;
              return { length: width, offset: width * index, index };
            }}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const width = Dimensions.get('window').width;
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setFullscreenIndex(index);
            }}
            renderItem={({ item }) => (
              <View style={styles.fullscreenSlide}>
                <Image source={{ uri: item }} style={styles.fullscreenImage} resizeMode="contain" />
              </View>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  carouselWrap: {
    width: '100%',
    borderRadius: radius.input,
    overflow: 'hidden',
    backgroundColor: colors.skeleton,
  },
  image: {
    width: '100%',
    backgroundColor: colors.skeleton,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: colors.navy,
  },
  dotInactive: {
    backgroundColor: colors.border,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: colors.black,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.xs,
  },
  fullscreenCountBadge: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    zIndex: 10,
  },
  fullscreenCountBadgeInner: {
    backgroundColor: colors.navy,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  fullscreenCountText: {
    color: colors.surface,
    fontFamily: 'DMMono-Medium',
    fontSize: 12,
  },
  fullscreenSlide: {
    width: Dimensions.get('window').width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  fullscreenImage: {
    width: '100%',
    height: '86%',
  },
});
