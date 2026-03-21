<img src="./app/public/images/FrontPageLogo.png" alt="ThreeSpace Logo" width=400 />

**A self-contained 3D scene editor and player built on [Three.js](https://threejs.org).**

ThreeSpace provides you an editor for three.js scenes, and a player to load those into your application. Scenes are serialized as plain JSON, so they are trivial to store, fetch, and share.

[![npm version](https://img.shields.io/npm/v/threespace)](https://www.npmjs.com/package/threespace)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Demos

[Player](https://keiththomas1.github.io/threespace)

[Editor](https://keiththomas1.github.io/threespace/editor)

---

## Features

- **Editor** — drag-and-drop scene builder with transform gizmos, a live properties panel, color picker, and real-time preview
- **Player** — lightweight runtime renderer (populates a three.js scene with optional functionality per-object)
- **Component system** — Models, Images, Videos, Audio, 3D Text, Lights, Cameras, and VFX particles
- **Serializable scenes** — the entire scene is a typed JSON object (`PlayerProperties`) you can save, version, and reload
- **Dual-package** — ships both ESM and CommonJS builds with full TypeScript declarations

---

## Installation

```bash
npm install threespace three
```

`three` is a peer dependency and must be installed alongside the package.

---

## Running the demo locally

The `demo/` directory contains a Next.js app that exercises both the editor and player.

```bash
cd demo
npm install
npm run dev
```

Open the player at [http://localhost:3000](http://localhost:3000).

Open the editor at [http://localhost:3000/editor](http://localhost:3000/editor).

---

## Building the library

```bash
cd app
npm install
npm run build   # outputs to app/dist/
```

---

## Usage

### Player

Allowing ThreeSpace to create the canvas:

```ts
import { ThreeSpacePlayer, PlayerProperties } from 'threespace';
import playerSettingsJSON from './yourSettings.json';

const player = new ThreeSpacePlayer(document.getElementById('playerParent'), playerSettingsJSON as PlayerProperties);
```

Or render a saved scene inside your canvas:

```ts
import { ThreeSpacePlayer, PlayerProperties } from 'threespace';
import playerSettingsJSON from './yourSettings.json';

const canvas: HTMLCanvasElement;
const player = new ThreeSpacePlayer(document.getElementById('playerParent'), playerSettingsJSON as PlayerProperties, canvas);
```

### Editor

Embed the full scene editor:

```ts
import { ThreeSpaceEditor, PlayerProperties, EditorConfig } from 'threespace';
import playerSettingsJSON from './yourSettings.json';

const editorConfig: EditorConfig = {
  assetBasePath: "/scenes/",
  playerProperties: playerSettingsJSON as PlayerProperties
};

const editor = new ThreeSpaceEditor(document.getElementById('editorParent'), editorConfig);
```

To load an existing scene into a running editor:

```ts
editor.PlayerProperties = myProperties;
```

---

## Scene format

A scene is a plain JSON object that matches the `PlayerProperties` type:

```ts
/** Properties of the ThreeSpace player */
export interface PlayerProperties {
  schemaVersion: number, // For versioning of the player settings format.
  sceneProperties: SceneProperties, // General properties of the scene such as background color and type.
  components: ComponentProperties[] // All components in the scene such as cameras, lights, models, etc. with their properties.
}
```

Each component has properties:

```ts
/**
 * Properties for a component in the scene such as a camera, light, model, etc. Each component has its own specific properties but they all share these common properties.
 */
export interface ComponentProperties {
  componentType: string, // The type of the component such as "Camera", "Light", "Model", etc.
  transformMatrix: number[], // The 4x4 transformation matrix of the component serialized into an array (in column-major order).
  url?: string, // The source URL for components that require an external resource such as models, images, videos, etc.
  filepath?: string, // The original filepath for the component resource, used instead of URL for local files.
  action: ComponentAction, // The action that occurs when the component is interacted with.
  credit: CreditInfo, // The credit information for the component's resource, if applicable. Artist, designer, etc.
}
```

### Component types

| `ComponentType` | Description |
|-----------------|-------------|
| `MODEL`  | glTF/GLB model with optional animation playback |
| `IMAGE`  | Flat image plane |
| `VIDEO`  | Video texture plane |
| `AUDIO`  | Positional or ambient audio source |
| `TEXT3D` | Extruded 3D text mesh |
| `LIGHT`  | Ambient or Directional light |
| `CAMERA` | Scene camera with configurable FOV and target |
| `VFX`    | Particle effect — `BASIC`, `SNOW`, `DUST`, `RAIN`, or `FISH` |

### Background

```ts
/** General properties of the scene such as background color and type */
export interface SceneProperties {
  componentType: ComponentType, // Of the "Settings" type (all components need this for properties window).
  backgroundColorType: BackgroundColorType, // Whether the background is a single color or a gradient.
  colorOne: SerializableColor,
  colorTwo: SerializableColor,
}
```

---

## Callbacks

| Option | Type | Description |
|--------|------|-------------|
| `onSave` | `(scene: PlayerProperties) => void` | Called when the user clicks Save |
| `onLoad` | `() => Promise<PlayerProperties \| null>` | Called when the user clicks Load |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for coding standards, architecture guidelines, and development workflow.

---

## Other Tools

The [official three.js editor](https://threejs.org/editor/) is quite good, if you prefer their interface. Also open source.

---

## License

[MIT](LICENSE) — Copyright (c) 2026 Keith Thomas
