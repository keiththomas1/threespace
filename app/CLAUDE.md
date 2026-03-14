# ThreeSpace App — Contributor Guide for Claude

This document describes the architecture, coding conventions, and patterns used in the `app` package. Follow these strictly when adding or modifying code.

> See [CONTRIBUTING.md](../CONTRIBUTING.md) at the repo root first for contribution info and style guide.

---

## Directory Structure

```
app/
  scripts/
    index.ts                    # Root export (re-exports player + editor)
    player/
      index.ts                  # Player public API
      threeSpacePlayer.ts       # Main player class
      components/
        playerComponent.ts      # Lightweight runtime component
      utils/
        playerDefinitions.ts    # Shared interfaces & enums
        playerUtils.ts          # Static utility/conversion methods
      actionManager.ts          # Handles component click actions
    editor/
      index.ts                  # Editor public API
      ThreeSpaceEditor.ts       # Main editor class
      components/
        baseComponent.ts        # Abstract base for all editor components
        lightComponent.ts       # Concrete component example
        cameraComponent.ts
        modelComponent.ts
        ...
      utils/
        constants.ts            # Shared constants (UPPER_SNAKE_CASE)
        threeUtilities.ts       # Three.js-specific helpers
      componentManager.ts       # Manages component lifecycle in editor
      componentFactory.ts       # Factory for creating complex objects
  public/                       # Static assets (models, textures)
  tsup.config.ts                # Build configuration
  tsconfig.json
  package.json
```

---