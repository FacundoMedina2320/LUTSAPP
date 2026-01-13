import { useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

export default function BeforeAfterSlider({
  beforeUri,
  afterUri,
  height = 420,
  radius = 24,
}: {
  beforeUri?: string | null;
  afterUri?: string | null;
  height?: number;
  radius?: number;
}) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    x.value = w / 2;
  };

  const pan = Gesture.Pan().onChange((e) => {
    if (!width) return;
    const next = Math.min(Math.max(e.x, 0), width);
    x.value = next;
  });

  const clipStyle = useAnimatedStyle(() => ({
    width: x.value,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - 16 }],
  }));

  const hasAfter = Boolean(afterUri);
  const hasBefore = Boolean(beforeUri);

  return (
    <View style={[styles.wrap, { height, borderRadius: radius }]} onLayout={onLayout}>
      {hasAfter ? (
        <Image source={{ uri: String(afterUri) }} style={[styles.img, { height }]} />
      ) : (
        <View style={[styles.placeholder, { height }]}>
          <View style={styles.placeholderDot} />
        </View>
      )}

      {hasBefore && (
        <Animated.View style={[styles.beforeWrap, clipStyle]}>
          <Image source={{ uri: String(beforeUri) }} style={[styles.img, { height }]} />
        </Animated.View>
      )}

      {width > 0 && hasBefore && hasAfter && (
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.handle, handleStyle]}>
            <View style={styles.line} />
            <View style={styles.knob} />
            <View style={styles.line} />
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  placeholder: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#efefef",
  },
  placeholderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  img: {
    width: "100%",
    resizeMode: "cover",
  },
  beforeWrap: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  handle: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  knob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
});
