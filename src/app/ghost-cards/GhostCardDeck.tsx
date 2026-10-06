import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  MeshReflectorMaterial,
  OrbitControls,
  Text,
} from "@react-three/drei";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  CARDS_MAX_HISTORY,
  DEFAULT_CARD_SPACING,
  cardsBorderWorldThickness,
  type CardsStyle,
} from "./constants";
import {
  getGhostFrameBridgeState,
  subscribeGhostFrameBridge,
} from "./ghostFrameBridge";
import {
  compositeCardFrame,
  type CardCompositeOptions,
} from "./compositeCardFrame";
import {
  blitAndPushCardsFrame,
  isCardsRecordingActive,
} from "./cardsRecordBridge";

export type GhostCardDeckProps = {
  ghostTrail: number;
  ghostFrames: number;
  ghostDecay: number;
  ghostSpeed: number;
  showGhostTrails: boolean;
  includeBackground: boolean;
  kaleidoscopeMode: "none" | "horizontal" | "vertical" | "radial";
  blendMode: string;
  haziness: number;
  grainIntensity: number;
  showRawVideo: boolean;
  rawVideoElement: HTMLVideoElement | null;
  rawVideoOpacity: number;
  bodySegmentationEnabled: boolean;
  motionAnalysisEnabled: boolean;
  blobTrackingEnabled: boolean;
  depthEnabled: boolean;
  sourceWidth: number;
  sourceHeight: number;
  cardsStyle: CardsStyle;
  /** Increment to reset orbit camera to home. */
  cameraResetKey?: number;
  glCanvasRef?: MutableRefObject<HTMLCanvasElement | null>;
};

/** Local font for drei/troika Text (CSS @font-face cannot drive WebGL text). */
const FLOOR_TICK_FONT = "/fonts/RobotoMono-Regular.woff";
const CARD_HEIGHT = 2.4;
const FLOOR_Y = -1.35;
const HOME_CAMERA: [number, number, number] = [0, 0.35, 4.2];

/** Match BodySegmentationLayer capture cadence (assumes ~60Hz raf). */
function captureIntervalSec(ghostSpeed: number): number {
  const frameSkip = Math.max(1, Math.floor(60 - ghostSpeed * 59));
  return frameSkip / 60;
}

function cardAlpha(
  slotFromFront: number,
  totalHistory: number,
  ghostTrail: number,
  ghostDecay: number
): number {
  if (totalHistory <= 1) return ghostTrail;
  const age = slotFromFront / Math.max(1, totalHistory - 1);
  const decayFactor = 1 - ghostDecay * 0.5;
  return ghostTrail * Math.pow(decayFactor, age * 5);
}

function SourceAspectCamera({ aspect }: { aspect: number }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  useLayoutEffect(() => {
    gl.domElement.classList.add("ghost-cards-canvas");
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
  }, [aspect, camera, gl]);

  useFrame(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      if (Math.abs(camera.aspect - aspect) > 0.001) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}

function CameraRig({ resetKey = 0 }: { resetKey?: number }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    const c = controlsRef.current;
    if (!c || savedRef.current) return;
    c.saveState();
    savedRef.current = true;
  }, []);

  useEffect(() => {
    if (resetKey > 0) {
      controlsRef.current?.reset();
    }
  }, [resetKey]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom
      enableDamping
      dampingFactor={0.08}
      minDistance={2.4}
      maxDistance={9}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI - 0.35}
      target={[0, -0.15, -1.2]}
    />
  );
}

function ReflectiveFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, -1.8]}>
      <planeGeometry args={[18, 18]} />
      <MeshReflectorMaterial
        blur={[280, 80]}
        resolution={384}
        mixBlur={0.85}
        mixStrength={28}
        roughness={0.85}
        depthScale={0.6}
        minDepthThreshold={0.35}
        maxDepthThreshold={1.35}
        color="#12151c"
        metalness={0.55}
        mirror={0.35}
      />
    </mesh>
  );
}

function formatTickLabel(seconds: number): string {
  if (Math.abs(seconds) < 0.0005) return "0";
  const abs = Math.abs(seconds);
  if (abs >= 1) return `${seconds.toFixed(1)}s`;
  return `${Math.round(seconds * 1000)}ms`;
}

/** Floor ruler: one tick under each card slot; spacing matches ghost capture cadence. */
function TimelineTicks({
  historyCount,
  ghostSpeed,
  cardWidth,
  slotZ,
}: {
  historyCount: number;
  ghostSpeed: number;
  cardWidth: number;
  slotZ: number;
}) {
  const dt = captureIntervalSec(ghostSpeed);
  const slots = historyCount + 1; // live + history
  const spanZ = historyCount * slotZ;
  const railZ = -spanZ / 2;
  const halfW = cardWidth * 0.42;

  const ticks = useMemo(() => {
    return Array.from({ length: slots }, (_, slot) => {
      const z = -slot * slotZ;
      const t = -slot * dt;
      return { z, t, major: slot === 0 || slot === historyCount };
    });
  }, [slots, historyCount, dt, slotZ]);

  return (
    <group position={[0, FLOOR_Y + 0.002, 0]}>
      {/* Center rail along depth */}
      <mesh position={[0, 0, railZ]}>
        <boxGeometry args={[0.012, 0.004, Math.max(slotZ, spanZ)]} />
        <meshBasicMaterial color="#9aa3b5" transparent opacity={0.55} />
      </mesh>

      {ticks.map(({ z, t, major }) => (
        <group key={`tick-${z}`} position={[0, 0, z]}>
          <mesh>
            <boxGeometry
              args={[major ? halfW * 2 : halfW * 1.15, 0.005, major ? 0.018 : 0.01]}
            />
            <meshBasicMaterial
              color={major ? "#e8eef8" : "#8b93a3"}
              transparent
              opacity={major ? 0.85 : 0.55}
            />
          </mesh>
          <Text
            font={FLOOR_TICK_FONT}
            position={[halfW + 0.12, 0.02, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={major ? 0.09 : 0.07}
            color={major ? "#e8eef8" : "#a8b0c0"}
            anchorX="left"
            anchorY="middle"
            outlineWidth={0.004}
            outlineColor="#07080c"
          >
            {formatTickLabel(t)}
          </Text>
        </group>
      ))}
    </group>
  );
}

/** Thin solid frame from four edge strips (not a full backing plate). */
function SolidCardFrame({
  width,
  height,
  thickness,
  color,
  opacity,
  renderOrder,
}: {
  width: number;
  height: number;
  thickness: number;
  color: string;
  opacity: number;
  renderOrder: number;
}) {
  const t = Math.max(0.004, thickness);
  const z = -0.0015;
  const edges: { pos: [number, number, number]; size: [number, number] }[] = [
    { pos: [0, height / 2 + t / 2, z], size: [width + t * 2, t] },
    { pos: [0, -(height / 2 + t / 2), z], size: [width + t * 2, t] },
    { pos: [-(width / 2 + t / 2), 0, z], size: [t, height] },
    { pos: [width / 2 + t / 2, 0, z], size: [t, height] },
  ];

  return (
    <group>
      {edges.map((edge, i) => (
        <mesh key={i} position={edge.pos} renderOrder={renderOrder}>
          <planeGeometry args={edge.size} />
          <meshBasicMaterial
            color={color}
            transparent={opacity < 0.99}
            opacity={opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function CardPlane({
  width,
  height,
  z,
  renderOrder,
  opacity,
  map,
  glassBacking,
  borderColor,
  borderWidth,
  borderOpacity,
  materialRef,
}: {
  width: number;
  height: number;
  z: number;
  renderOrder: number;
  opacity: number;
  map: THREE.Texture | null;
  /** Frosted plate behind the video — live card only so history isn't tinted. */
  glassBacking: boolean;
  borderColor: string;
  borderWidth: number;
  borderOpacity: number;
  materialRef?: (m: THREE.MeshBasicMaterial | null) => void;
}) {
  const showBorder = borderWidth >= 1 && borderOpacity > 0.01;
  const frameOpacity = Math.min(1, borderOpacity * Math.max(opacity, 0.2));
  const worldBorder = cardsBorderWorldThickness(borderWidth);

  return (
    <group position={[0, 0, z]}>
      {glassBacking && (
        <mesh position={[0, 0, -0.006]} renderOrder={renderOrder}>
          <planeGeometry args={[width * 1.01, height * 1.01]} />
          <meshPhysicalMaterial
            color="#eef3fa"
            transparent
            opacity={0.22}
            transmission={0.9}
            thickness={0.2}
            roughness={0.12}
            metalness={0}
            ior={1.45}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}

      {showBorder && (
        <SolidCardFrame
          width={width}
          height={height}
          thickness={worldBorder}
          color={borderColor}
          opacity={frameOpacity}
          renderOrder={renderOrder + 1}
        />
      )}

      {/* Video / silhouette face — always unlit basic so ghosts keep true colors */}
      <mesh renderOrder={renderOrder + 2}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={materialRef}
          map={map}
          transparent
          opacity={opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function DeckScene({
  ghostTrail,
  ghostFrames,
  ghostDecay,
  ghostSpeed,
  showGhostTrails,
  includeBackground,
  kaleidoscopeMode,
  blendMode,
  haziness,
  grainIntensity,
  showRawVideo,
  rawVideoElement,
  rawVideoOpacity,
  bodySegmentationEnabled,
  motionAnalysisEnabled,
  blobTrackingEnabled,
  depthEnabled,
  sourceWidth,
  sourceHeight,
  cardsStyle,
  cameraResetKey = 0,
  glCanvasRef,
}: GhostCardDeckProps) {
  const { gl } = useThree();
  const historyCount = Math.max(
    3,
    Math.min(CARDS_MAX_HISTORY, Math.floor(ghostFrames))
  );
  const aspect =
    sourceWidth > 0 && sourceHeight > 0
      ? sourceWidth / sourceHeight
      : 16 / 9;

  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyCanvasesRef = useRef<HTMLCanvasElement[]>([]);
  const lastCaptureIdRef = useRef(0);
  const liveTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const historyTexturesRef = useRef<THREE.CanvasTexture[]>([]);
  const liveMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const historyMatsRef = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  const [texDims, setTexDims] = useState(() => {
    if (sourceWidth > 1 && sourceHeight > 1) {
      return { width: sourceWidth, height: sourceHeight };
    }
    const s = getGhostFrameBridgeState();
    return { width: s.width || 640, height: s.height || 480 };
  });

  const [liveMap, setLiveMap] = useState<THREE.CanvasTexture | null>(null);
  const [historyMaps, setHistoryMaps] = useState<(THREE.CanvasTexture | null)[]>(
    []
  );

  useEffect(() => {
    if (glCanvasRef) {
      glCanvasRef.current = gl.domElement;
      gl.domElement.classList.add("ghost-cards-canvas");
    }
    return () => {
      if (glCanvasRef && glCanvasRef.current === gl.domElement) {
        glCanvasRef.current = null;
      }
    };
  }, [gl, glCanvasRef]);

  useEffect(() => {
    if (sourceWidth > 1 && sourceHeight > 1) {
      setTexDims({ width: sourceWidth, height: sourceHeight });
      return;
    }
    return subscribeGhostFrameBridge((s) => {
      if (s.width > 0 && s.height > 0) {
        setTexDims({ width: s.width, height: s.height });
      }
    });
  }, [sourceWidth, sourceHeight]);

  useEffect(() => {
    const w = Math.max(2, texDims.width);
    const h = Math.max(2, texDims.height);

    if (!liveCanvasRef.current) {
      liveCanvasRef.current = document.createElement("canvas");
    }
    liveCanvasRef.current.width = w;
    liveCanvasRef.current.height = h;

    while (historyCanvasesRef.current.length < historyCount) {
      historyCanvasesRef.current.push(document.createElement("canvas"));
    }
    historyCanvasesRef.current.length = historyCount;
    for (const c of historyCanvasesRef.current) {
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx?.clearRect(0, 0, w, h);
    }

    if (liveTextureRef.current) {
      liveTextureRef.current.dispose();
    }
    liveTextureRef.current = new THREE.CanvasTexture(liveCanvasRef.current);
    liveTextureRef.current.colorSpace = THREE.SRGBColorSpace;
    liveTextureRef.current.needsUpdate = true;
    setLiveMap(liveTextureRef.current);

    for (const t of historyTexturesRef.current) {
      t.dispose();
    }
    historyTexturesRef.current = historyCanvasesRef.current.map((c) => {
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      return tex;
    });
    setHistoryMaps([...historyTexturesRef.current]);

    lastCaptureIdRef.current = getGhostFrameBridgeState().captureId;
  }, [texDims.width, texDims.height, historyCount]);

  const compositeOpts = useMemo((): Omit<CardCompositeOptions, "dest"> => {
    return {
      includeBackground,
      kaleidoscopeMode,
      blendMode,
      haziness,
      grainIntensity,
      showRawVideo,
      rawVideoElement,
      rawVideoOpacity,
      bodySegmentationEnabled,
      motionAnalysisEnabled,
      blobTrackingEnabled,
      depthEnabled,
    };
  }, [
    includeBackground,
    kaleidoscopeMode,
    blendMode,
    haziness,
    grainIntensity,
    showRawVideo,
    rawVideoElement,
    rawVideoOpacity,
    bodySegmentationEnabled,
    motionAnalysisEnabled,
    blobTrackingEnabled,
    depthEnabled,
  ]);

  useFrame(() => {
    const live = liveCanvasRef.current;
    if (!live || live.width < 2) return;

    compositeCardFrame({ dest: live, ...compositeOpts });
    if (liveTextureRef.current) {
      liveTextureRef.current.needsUpdate = true;
    }

    const { captureId } = getGhostFrameBridgeState();
    if (
      showGhostTrails &&
      captureId !== lastCaptureIdRef.current &&
      historyCanvasesRef.current.length > 0
    ) {
      lastCaptureIdRef.current = captureId;
      const oldest = historyCanvasesRef.current.shift()!;
      const ctx = oldest.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, oldest.width, oldest.height);
        ctx.drawImage(live, 0, 0);
      }
      historyCanvasesRef.current.push(oldest);

      for (let i = 0; i < historyCanvasesRef.current.length; i++) {
        const tex = historyTexturesRef.current[i];
        if (tex) {
          tex.image = historyCanvasesRef.current[i];
          tex.needsUpdate = true;
        }
      }
    }

    const n = historyCanvasesRef.current.length;
    for (let i = 0; i < n; i++) {
      const mat = historyMatsRef.current[i];
      if (!mat) continue;
      const slotFromFront = n - 1 - i;
      const alpha = showGhostTrails
        ? cardAlpha(slotFromFront, n, ghostTrail, ghostDecay)
        : 0;
      mat.opacity = alpha;
      mat.visible = showGhostTrails && alpha > 0.02;
    }

    if (liveMatRef.current) {
      liveMatRef.current.opacity = 1;
      liveMatRef.current.visible = true;
    }
  });

  useFrame((state) => {
    state.gl.render(state.scene, state.camera);
    if (isCardsRecordingActive()) {
      blitAndPushCardsFrame(state.gl.domElement);
    }
  }, 1);

  const cardWidth = CARD_HEIGHT * aspect;
  const historyMeshes = useMemo(() => {
    return Array.from({ length: historyCount }, (_, i) => i);
  }, [historyCount]);

  const { glass, showFloor, borderColor, borderWidth, borderOpacity, cardSpacing } =
    cardsStyle;
  const slotZ = Number.isFinite(cardSpacing)
    ? Math.max(DEFAULT_CARD_SPACING, cardSpacing)
    : DEFAULT_CARD_SPACING;
  const needEnv = glass || showFloor;

  return (
    <>
      <SourceAspectCamera aspect={aspect} />
      <color attach="background" args={["#07080c"]} />
      <ambientLight intensity={glass || showFloor ? 0.55 : 0.2} />
      <directionalLight position={[3.5, 5.5, 2.5]} intensity={1.15} />
      <directionalLight position={[-2.5, 2, -3]} intensity={0.35} />

      {needEnv && (
        <Suspense fallback={null}>
          <Environment preset="night" environmentIntensity={0.65} />
        </Suspense>
      )}

      {showFloor && (
        <>
          <ReflectiveFloor />
          <TimelineTicks
            historyCount={historyCount}
            ghostSpeed={ghostSpeed}
            cardWidth={cardWidth}
            slotZ={slotZ}
          />
        </>
      )}

      <CardPlane
        width={cardWidth}
        height={CARD_HEIGHT}
        z={0}
        renderOrder={historyCount + 2}
        opacity={1}
        map={liveMap}
        glassBacking={glass}
        borderColor={borderColor}
        borderWidth={borderWidth}
        borderOpacity={borderOpacity}
        materialRef={(m) => {
          liveMatRef.current = m;
        }}
      />

      {historyMeshes.map((i) => {
        const slotFromFront = historyCount - 1 - i;
        const z = -(slotFromFront + 1) * slotZ;
        return (
          <CardPlane
            key={i}
            width={cardWidth}
            height={CARD_HEIGHT}
            z={z}
            renderOrder={i}
            opacity={0}
            map={historyMaps[i] ?? null}
            glassBacking={false}
            borderColor={borderColor}
            borderWidth={borderWidth}
            borderOpacity={borderOpacity}
            materialRef={(m) => {
              historyMatsRef.current[i] = m;
            }}
          />
        );
      })}

      <CameraRig resetKey={cameraResetKey} />
    </>
  );
}

export function GhostCardDeck(props: GhostCardDeckProps) {
  const { sourceWidth, sourceHeight } = props;
  const w = Math.max(2, sourceWidth || 640);
  const h = Math.max(2, sourceHeight || 480);
  const aspect = w / h;

  return (
    <div className="absolute inset-0 z-[12] flex items-center justify-center bg-[#07080c]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(40,48,68,0.55) 0%, rgba(7,8,12,0.95) 70%)",
        }}
      />
      <div
        className="relative z-[1]"
        style={{
          aspectRatio: `${w} / ${h}`,
          width: `min(100%, calc(100vh * ${aspect}))`,
          height: `min(100%, calc(100vw / ${aspect}))`,
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      >
        <Canvas
          className="ghost-cards-root absolute inset-0 !h-full !w-full"
          gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
          camera={{
            position: HOME_CAMERA,
            fov: 42,
            near: 0.1,
            far: 100,
          }}
          dpr={1}
          resize={{ scroll: false, debounce: 0 }}
        >
          <Suspense fallback={null}>
            <DeckScene {...props} sourceWidth={w} sourceHeight={h} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
