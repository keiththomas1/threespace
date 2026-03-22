# Changelog

All notable changes to the `threespace` npm package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-03-22

### Added
- Undo/redo support in the editor — property changes, component additions, and component deletions are all undoable via Ctrl+Z / Ctrl+Y
- Pathing UI on asset import — shows a path confirmation popup with cached paths for previously imported assets
- Text3D component can now be duplicated
- Improved demo scenes: HexLowPoly (low-poly forest with ambient audio) and Lab (science lab environment)

### Fixed
- Multi-scene audio loading
- Mute and credit buttons now appear correctly for scenes that have audio but no credit entries
- Audio prompt ("Click anywhere to play audio") no longer shown for users who have already interacted with the page

## [1.2.0] - 2026-03-21

### Added
- In-player mute/unmute button and credit popup button
- Audio pauses when the browser tab is hidden and resumes on return
- Updated demo scenes

## [1.1.0] - 2026-03-15

### Added
- URL / filepath property editor for asset-based components (Model, Image, Video, Audio) — includes a "Relative Server Path" / "Internet URL" dropdown that sets the correct underlying field and clears the other
- `ComponentType` enum exported from the `threespace/player` entry point
- Grid overlay feature for positioning objects in the editor
- Project View panel showing all scene components in a hierarchy
- `AssetManager` class for controlling asset base paths and font definitions — fonts and asset paths are now injected by the consuming application rather than hard-coded

### Fixed
- Project View panel disappearing after certain interactions
- Various editor UI and stability improvements
- Light color no longer serializes as a raw integer — `THREE.Color.toJSON()` was being called implicitly by `JSON.stringify`; colors are now correctly stored as `{ r, g, b }` objects
- VFX component color property now serializes correctly (same root cause as light color)
- Directional light rotation now affects the light direction — the `target` object is placed at a local offset and added to the scene so rotation of the component rotates the light direction
- Images loaded through HTML (e.g. editor UI icons, carousel arrows) now use the correct base path on GitHub Pages — base path is initialized in the page constructor before any render calls rather than in `componentDidMount`

### Changed
- `three` and `animejs` moved from `dependencies` to `peerDependencies` — consumers who already have `three` installed will no longer receive a duplicate copy

## [1.0.0]

### Added
- `ThreeSpacePlayer` — lightweight runtime renderer for displaying serialized scenes
- `ThreeSpaceEditor` — full-featured scene editor with component management, property editing, and scene serialization
- Component types: Camera, AmbientLight, DirectionalLight, Model, Image, Video, Audio, Text3D, VFX
- Transform, Action, and Credit property panels in the editor
- Post-processing pipeline with outline effects
- OrbitControls-based camera navigation
- Scene serialization to / deserialization from JSON (`PlayerProperties`)
- AR / VR button support via WebXR
- Separate `threespace/player` and `threespace/editor` entry points for tree-shaking
