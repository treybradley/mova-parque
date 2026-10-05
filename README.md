# Mova Parque

**Creative motion lab for Mova Atlética** — live camera and uploaded video become layered visuals, depth, pose overlays, sound, and exportable clips across three mini-apps in one shell.

> **Sister product (trainers & athletes):**  
> **[Mova Atlética](https://www.mova-atletica.xyz/)** · [app.mova-atletica.xyz](https://app.mova-atletica.xyz) · [portfolio case study](https://www.treybradley.xyz/mova-atletica)  
>
> **Design system:** [MA Beta Design System (Figma)](https://www.figma.com/design/If7L5q9fnsivf9mkaiFH4n/MA-Beta-Design-System)

_Built as the R&D / creative suite next to the motion-analysis MVP (`mova-mvp-dev-01`): shared brand language, glass chrome, auth patterns, and design tokens — different job (play, compose, export) rather than sport coaching._

---

## What ships today

| Surface | What it does |
|--------|----------------|
| **Mova Parque** | Real-time visual system: body segmentation ghosts, kaleidoscope, film grain, blob tracking, MoveNet pose, Depth Anything, Tone.js sound, record/export (flat trails or 3D **Cards**) |
| **Video to Frames** | Upload → extract frames → print-ready contact sheets (grid, margins, registration marks, PDF/print) |
| **Mova Score** | Color-blob tracking → visual score overlays → live synth + MIDI export |

One Vite/React app; mode switch in the shared sidebar keeps chrome, logomark, and auth consistent across mini-apps.

---

## User flow

```mermaid
flowchart TD
  START([Land · Mova Parque shell]) --> MODE{Choose mini-app}

  MODE -->|Parque| PQ[Webcam or upload]
  MODE -->|Video to Frames| VTF[Upload video]
  MODE -->|Mova Score| MS[Upload / play clip]

  PQ --> LAYERS[Toggle ML + graphics layers]
  LAYERS --> COMP[Compose canvas stack]
  COMP --> VIEW{Trail view}
  VIEW -->|Flat| FLAT[2D ghost composite]
  VIEW -->|Cards| CARDS[R3F ghost card deck]
  FLAT --> REC[Record · WebM / MP4 path]
  CARDS --> REC
  REC --> OUT([Download clip])

  VTF --> FRAMES[Extract frames]
  FRAMES --> PAGE[Page settings · grid]
  PAGE --> PRINT([Print / PDF / download])

  MS --> BLOBS[Track color blobs]
  BLOBS --> SCORE[Score visuals + sound]
  SCORE --> MIDI([Export MIDI / record])
```

---

## System architecture

```mermaid
flowchart TB
  subgraph Shell["Shared shell"]
    APP["App.tsx · appMode"]
    CP["ControlPanel / Sidebar chrome"]
    AUTH["AuthProvider · SignInModal · Supabase"]
    UI["components/ui · Radix + tokens"]
    DS["fonts.css · theme.css · Typekit"]
  end

  subgraph Mini["Mini-apps"]
    PQ["mova-parque · layer stack"]
    VTF["video-to-frames"]
    MS["mova-score"]
  end

  subgraph ML["ML (client-side)"]
    SEG["Body segmentation · MediaPipe Selfie"]
    POSE["Pose · MoveNet"]
    DEPTH["Depth Anything V2 · ONNX"]
    BLOB["Blob tracking · color / motion"]
  end

  subgraph GFX["Graphics / vis"]
    RAW["RawVideoLayer"]
    KALE["KaleidoscopeLayer"]
    GRAIN["FilmGrainLayer"]
    GHOST["Ghost trails / Cards"]
    WM["WatermarkLayer"]
  end

  subgraph Export["Capture"]
    REC["recording/ · MediaRecorder"]
    CARDS3D["ghost-cards · R3F blit bridge"]
  end

  APP --> CP
  APP --> AUTH
  APP --> UI
  APP --> DS
  APP --> PQ & VTF & MS
  PQ --> ML
  PQ --> GFX
  PQ --> Export
  MS --> BLOB
  VTF --> PAGEUI["FrameExtractor · PagePreview"]
```

**Stack (high level)**

| Layer | Technology |
|-------|------------|
| App shell | Vite 6, React 18, TypeScript |
| Styling | Tailwind CSS 4, CSS variables, Adobe Fonts (Typekit `ldv0cwj`) |
| UI primitives | Radix UI + shadcn-style `components/ui` |
| 3D / Cards | Three.js, React Three Fiber, Drei |
| Pose / body | TensorFlow.js, `@tensorflow-models/pose-detection` (MoveNet), `@tensorflow-models/body-segmentation` (MediaPipe Selfie) |
| Depth | ONNX Runtime Web · Depth Anything V2 Small |
| Audio | Tone.js (`AudioEngine`) · Mova Score synth + MIDI |
| Auth / backend | Supabase JS (session-aligned with Atlética product patterns) |
| Export | Canvas composite + `MediaRecorder` (`recording/`) |

---

## ML pipeline

```mermaid
flowchart TB
  SRC["1 · Source<br/>webcam stream or uploaded HTMLVideoElement"] --> PRE["2 · Shared video ref<br/>one decode · many consumers"]
  PRE --> SEG["3a · Selfie segmentation<br/>mask · ghost FIFO"]
  PRE --> POSE["3b · MoveNet<br/>keypoints · skeleton overlay"]
  PRE --> DEPTH["3c · Depth Anything<br/>ONNX depth map / heatmap / x-ray"]
  PRE --> BLOB["3d · Blob tracking<br/>color tolerance · centroids"]
  SEG --> FX["4 · Body effects<br/>trail length · decay · speed · palette"]
  DEPTH --> FX
  POSE --> MET["5 · Motion metrics<br/>optional overlay"]
  BLOB --> VIZ["5b · Score / Parque blob viz"]
  FX --> COMP["6 · Layer composite<br/>for display + record"]
  MET --> COMP
  VIZ --> COMP
```

| Stage | Where it lives |
|-------|----------------|
| Segmentation + ghosts | `BodySegmentationLayer` · `ghost-cards/ghostFrameBridge` |
| Pose | `PoseEstimationLayer` · `utils/poseTracking` · `utils/drawPoseOverlay` |
| Depth | `DepthLayer` · `depth-anything/utils` |
| Blobs | `BlobTrackingLayer` · `utils/blobTracking` · Mova Score `utils/blobDetection` |
| Motion stats | `MotionAnalysisOverlay` · `utils/motionMetrics` |

**Principles (shared with Atlética)**

- **On-device first** — models run in the browser; no server round-trip for live FX.
- **Toggle honesty** — disabled layers drop out of the composite and the recorder.
- **Creative, not clinical** — Parque explores look and feel; sport coaching and Insights live in the sister product.

---

## Graphics / visualization pipeline

```mermaid
flowchart LR
  subgraph Stack["Canvas / WebGL stack (bottom → top)"]
    BG["Raw video / clear"]
    BODY["Segmentation · ghosts"]
    D["Depth tint"]
    K["Kaleidoscope"]
    B["Blobs / pose overlays"]
    G["Film grain"]
    W["Watermark"]
  end

  BG --> BODY --> D --> K --> B --> G --> W
  W --> DISP["Display"]
  W --> REC["RecordingEngine / Cards blit"]
```

| Concern | Implementation |
|---------|----------------|
| Blend / haze / mood | Atmosphere + palette controls in `App` → layers |
| Kaleidoscope | `KaleidoscopeLayer` · horizontal / vertical / radial |
| Flat vs Cards | `trailView`: flat composites in 2D; Cards lazy-loads `GhostCardDeck` (R3F + reflector floor + timeline ticks) |
| Cards export | `cardsRecordBridge` blits WebGL → 2D at source aspect |
| Sound | `SoundPanel` + `AudioEngine` (Tone) driven by mood / movement |

---

## Mini-app structure

```mermaid
flowchart TB
  subgraph Shared["Reused across mini-apps"]
    S1["Logomark · glass sidebar · app switcher"]
    S2["SignInModal · useAuth"]
    S3["components/ui · dialogs, sliders, buttons"]
    S4["Design tokens · Typekit · film-grain / gradient motifs"]
  end

  subgraph Parque["src/app + components/"]
    P1["ControlPanel · SoundPanel"]
    P2["*Layer.tsx stack"]
    P3["ghost-cards/ · recording/ · audio/"]
  end

  subgraph VTF["src/app/video-to-frames/"]
    V1["VideoToFramesApp"]
    V2["sidebar · frame-extractor · page-preview"]
  end

  subgraph Score["src/app/mova-score/"]
    M1["MovaScoreApp"]
    M2["VideoCanvas · Timeline · ControlPanel"]
    M3["midiGenerator · soundEngine"]
  end

  Shared --> Parque
  Shared --> VTF
  Shared --> Score
```

```
src/app/
├── App.tsx                 # mode router + Parque state
├── components/             # Parque layers + shared modals
│   ├── ui/                 # design-system primitives (Radix)
│   ├── ControlPanel.tsx    # shell + Parque controls
│   └── *Layer.tsx          # ML / graphics stack
├── ghost-cards/            # 3D trail view + record bridge
├── recording/              # MediaRecorder pipeline
├── audio/                  # Tone.js engine
├── depth-anything/         # ONNX depth helpers
├── auth/ · supabase/       # session
├── video-to-frames/        # mini-app
└── mova-score/             # mini-app
src/styles/                 # fonts · theme · Tailwind
src/utils/                  # pose, blobs, motion, color theory
```

Mini-apps keep **feature** components local (`mova-score/components`, `video-to-frames/components`) but share **shell language**: glass panels, uppercase micro-labels, Logomark, mode dropdown, auth modal, and the same tokenized UI kit — the same cohesion pattern as Atlética’s `LibraryShell` / account surfaces, tuned for a dark creative studio.

---

## Design system & component patterns

Aligned with **[MA Beta Design System](https://www.figma.com/design/If7L5q9fnsivf9mkaiFH4n/MA-Beta-Design-System)** (Figma library fills + components) and the product CSS in `mova-mvp-dev-01` (`src/app/globals.css`). Parque extends the same ramps into a **glass studio chrome** for live FX.

```mermaid
flowchart TB
  FIG["MA Beta · Figma"] --> TOK["CSS tokens<br/>theme.css · fonts.css"]
  TOK --> UI["components/ui"]
  TYPE["Typekit · roboto-mono · joost<br/>+ Atlética Roboto / Roboto Mono"] --> UI
  UI --> SHELL["Glass sidebar · app switcher"]
  UI --> MODALS["SignIn · Pitch · Usage"]
  SHELL --> PQ["Parque controls"]
  SHELL --> VTF["VTF sidebar"]
  SHELL --> MS["Score sidebar"]
```

### Color ramps (from Figma)

Library styles in MA Beta: **Stoic Onyx**, **Anatomical Parchment**, **Cenote Blue**, **Bioluminescent Green**, **Endurance Red**.

<p align="center">
  <img src="docs/design-system/ma-beta-palette.png" alt="MA Beta color ramps — Stoic Onyx, Anatomical Parchment, Cenote Blue, Bioluminescent Green, Endurance Red" width="720" />
</p>

| Ramp / token role | Key hex | Use in Parque |
|-------------------|---------|----------------|
| Stoic Onyx / `--background` | `#181a1a` | Stage void, Cards clear `#07080c` family |
| Stoic Onyx / foreground | `#F3F3F4` · `#c0c9cc` | Primary & secondary labels |
| Anatomical Parchment / `--card-bg` | `#f6f1e3` | Light surfaces, print previews |
| Anatomical Parchment muted | `#7d765f` | Secondary copy |
| Cenote Blue / `--accent` | `#3b82f6` | Product CTAs; glass chrome often uses white/alpha instead |
| Bioluminescent Green / `--success` | `#64FF58` | Armed / positive states |
| Endurance Red / `--error` · warning | `#FC7C7C` · `#ff8044` | Errors · caution |

**Parque glass chrome** (creative extension of Stoic Onyx):

| Pattern | Values |
|---------|--------|
| Panel | `bg-black/40` · `backdrop-blur-xl` · `border-white/10` |
| Label | `text-white/60` · `uppercase` · `tracking-wider` · `text-[11px]` |
| Control | `bg-white/5` · hover `bg-white/10` · active `bg-white/15` |

### Typography

| Family | Source | Use |
|--------|--------|-----|
| **roboto-mono** | Adobe Fonts kit `ldv0cwj` | Metrics, timecodes, Cards floor ticks (`font-mono`) |
| **joost** | Same Typekit kit | Display / sans option (`--font-sans`) |
| **Roboto / Roboto Mono** | Atlética product · MA Beta | Reference parity with portfolio |

### Components (from Figma)

MA Beta ships shared primitives (Button set, toggles, FABs, alerts, date pickers, etc.). Parque maps them through Radix + `components/ui` with the same token language.

<p align="center">
  <img src="docs/design-system/ma-beta-button.png" alt="MA Beta Design System Button component set" width="480" />
</p>

Source frame: [MA Beta · Button](https://www.figma.com/design/If7L5q9fnsivf9mkaiFH4n/MA-Beta-Design-System?node-id=93-16302) · palette board on Core UI (`README · MA Beta Palette`).

### Component anatomy — shared shell

```
Glass sidebar
├── Header — Logomark · title · app-mode dropdown · account
├── Source — webcam / upload / facing mode
├── Section stack — collapsible controls (Parque) or tabs (VTF / Score)
└── Footer — record / export / links

Primitives: Radix Dialog, Slider, Switch, Select, Dropdown …
Tokens: theme.css + Typekit · utility classes shared across mini-app sidebars
```

| Area | Location |
|------|----------|
| Shell / Parque controls | `src/app/components/ControlPanel.tsx` |
| UI kit | `src/app/components/ui/` |
| Tokens / type | `src/styles/theme.css`, `fonts.css`, `index.html` Typekit link |
| Design docs (Figma exports) | `docs/design-system/` |
| VTF / Score chrome | `*/components/sidebar.tsx`, `animated-gradient`, `film-grain`, `grid-pattern` |

Figma file: **[MA Beta Design System](https://www.figma.com/design/If7L5q9fnsivf9mkaiFH4n/MA-Beta-Design-System)** · portfolio gallery: **[treybradley.xyz/mova-atletica](https://www.treybradley.xyz/mova-atletica)**.

---

## Running the code

```bash
npm i
npm run dev
```

Build:

```bash
npm run build
```

Copy `.env.example` → `.env` and set Supabase (and any other) keys as needed for auth.

---

## License

See repository license / [`ATTRIBUTIONS.md`](./ATTRIBUTIONS.md) for third-party notices (including shadcn/ui).

## Support

Product and case-study context: **[treybradley.xyz/mova-atletica](https://www.treybradley.xyz/mova-atletica)**.  
Mova Atlética: [mova-atletica.xyz](https://www.mova-atletica.xyz/) · support@mova-atletica.xyz
