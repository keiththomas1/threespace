import { PlayerProperties } from "../player";
import { DEFAULT_SCENE_PROPERTIES, SCHEMA_VERSION } from "../player/utils/playerDefinitions";

export class SharedData {
  public static readonly EDITOR_LAYER = 31; // Layer index used for objects that should only be visible in the editor viewport, not the player preview.

  /** Returns the default properties for a scene. */
  public static get DefaultPlayerProperties(): PlayerProperties {
    return {
      schemaVersion: SCHEMA_VERSION,
      sceneProperties: DEFAULT_SCENE_PROPERTIES,
      components: []
    };
  }
}