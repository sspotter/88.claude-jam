# 3D Scroll Animation Implementation Guide

This document details the architecture and implementation of the scroll-based 3D image sequence animation used in this project. This can be used as a reference for porting the effect to other applications.

## Core Concepts

The animation works by preloading a sequence of images (frames) and rendering them to a high-performance `<canvas>` element based on the user's scroll position. [Framer Motion](https://www.framer.com/motion/) is used to handle scroll tracking and smoothing.

---

## 1. Component Architecture

The implementation is encapsulated in the `FriedChickenSequence.tsx` component.

### Key Dependencies
- `framer-motion`: For `useScroll`, `useTransform`, and `useSpring`.
- `react`: For hooks (`useEffect`, `useRef`, `useState`, `useMemo`).

---

## 2. Image Preloading Strategy

Loading hundreds of images can be heavy. The component uses an asynchronous preloading strategy with progress tracking.

```typescript
useEffect(() => {
  const loadedImages: HTMLImageElement[] = [];
  let index = 1;
  const totalFrames = 899;

  const loadNext = () => {
    if (index > totalFrames) {
      setImages(loadedImages);
      setIsLoaded(true);
      return;
    }
    const img = new Image();
    const frameNum = String(index).padStart(3, "0");
    img.src = `/sequence/ezgif-frame-${frameNum}.jpg`;

    img.onload = () => {
      loadedImages.push(img);
      setLoadProgress(Math.floor((loadedImages.length / totalFrames) * 100));
      index++;
      loadNext();
    };
    // ... error handling
  };
  loadNext();
}, []);
```

**Key Points:**
- **Padding:** Image filenames use 3-digit padding (e.g., `001.jpg`).
- **Progress:** A `loadProgress` state provides feedback to the user during initialization.

---

## 3. Scroll Tracking and Smoothing

To prevent the animation from feeling "stuttery," we apply a spring physics effect to the raw scroll value.

```typescript
const containerRef = useRef<HTMLDivElement>(null);

// 1. Get raw scroll progress (0 to 1)
const { scrollYProgress } = useScroll({
  target: containerRef,
  offset: ["start start", "end end"],
});

// 2. Smooth the progress using a spring
const smoothProgress = useSpring(scrollYProgress, {
  stiffness: 100,
  damping: 30,
  restDelta: 0.001,
});

// 3. Map progress to frame indices
const frameIndex = useTransform(
  smoothProgress,
  [0, 1],
  [0, frameCount - 1]
);
```

---

## 4. Canvas Rendering Engine

Rendering to a Canvas is significantly more performant than swapping `<img>` tags, as it avoids DOM thrashing.

### The Render Function
This function calculates the current frame and draws it to the canvas, maintaining a "cover" aspect ratio.

```typescript
const render = () => {
  const idx = Math.min(
    images.length - 1,
    Math.max(0, Math.floor(frameIndex.get()))
  );

  const img = images[idx];
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext("2d");
  if (!img || !canvas || !ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calculate "Object-Fit: Cover" logic
  const scale = Math.max(
    canvas.width / img.width,
    canvas.height / img.height
  );
  const x = canvas.width / 2 - (img.width * scale) / 2;
  const y = canvas.height / 2 - (img.height * scale) / 2;

  ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
};
```

### Syncing with Motion Values
We subscribe to the `frameIndex` motion value to trigger a re-render whenever the scroll position (or spring animation) updates.

```typescript
useEffect(() => {
  const unsubscribe = frameIndex.on("change", render);
  return () => unsubscribe();
}, [isLoaded, images, frameIndex]);
```

---

## 5. Responsive Handling

The canvas needs to resize dynamically to fill the viewport.

```typescript
const handleResize = () => {
  if (canvasRef.current) {
    canvasRef.current.width = window.innerWidth;
    canvasRef.current.height = window.innerHeight;
    render();
  }
};
window.addEventListener("resize", handleResize);
```

---

## 6. Text Overlays (Storytelling)

Text elements are synchronized with specific scroll ranges using `useTransform` to animate opacity.

```typescript
const opacityA = useTransform(progress, [0.1, 0.2, 0.3], [0, 1, 0]);
// Text is:
// Invisible at 0% - 10% scroll
// Fades in to full opacity at 20%
// Fades out by 30%
```

---

## 7. Implementation Checklist for New Projects

1.  **Sequence Export:** Export your 3D animation as a JPG sequence (lower file size than PNG).
2.  **Container Height:** Set the container height (e.g., `h-[400vh]`) to determine how "fast" the user scrolls through the frames.
3.  **Canvas Styling:** Ensure the canvas is `sticky` or `fixed` so it stays in the viewport while the sequence plays.
4.  **Loading UI:** Always include a loading screen, as preloading 500+ images takes time.

---

## 8. Usage Example

To use the animation in a page, simply wrap it in a main container. The component itself handles its own scroll container height.

```tsx
import { FriedChickenSequence } from "@/components/FriedChickenSequence";

export default function Home() {
  return (
    <main>
      <FriedChickenSequence />
      {/* Other sections follow after the scroll animation */}
    </main>
  );
}
```

