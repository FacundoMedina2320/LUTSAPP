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
  beforeUri: string;
  afterUri: string;
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

  return (
    <View style={[styles.wrap, { height, borderRadius: radius }]} onLayout={onLayout}>
      {/* AFTER */}
      <Image source={{ uri: afterUri }} style={[styles.img, { height }]} />

      {/* BEFORE */}
      <Animated.View style={[styles.beforeWrap, clipStyle]}>
        <Image source={{ uri: beforeUri }} style={[styles.img, { height }]} />
      </Animated.View>

      {width > 0 && (
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
