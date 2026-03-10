import { PlayerProperties } from "../player";
import { DEFAULT_SCENE_PROPERTIES, SCHEMA_VERSION } from "../player/utils/playerDefinitions";

export class SharedData {
  /** Returns the default properties for a scene. */
  public static get DefaultPlayerProperties(): PlayerProperties {
    return {
      schemaVersion: SCHEMA_VERSION,
      sceneProperties: DEFAULT_SCENE_PROPERTIES,
      components: []
    };
  }
}