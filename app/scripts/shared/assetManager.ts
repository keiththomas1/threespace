import { FontDefinition } from '../player/utils/playerDefinitions';

/**
 * Manages assets for the ThreeSpace player and editor, such as the base path for assets and font definitions. 
 * This allows for centralized management of asset-related information that can be accessed throughout the player.
 */
export class AssetManager {
  private static assetBasePath: string = '';
  private static fonts: FontDefinition[] = [];

  /** The "base path" where assets can be loaded from. Set by client. */
  public static get AssetBasePath(): string { return AssetManager.assetBasePath; }
  /** The "base path" where assets can be loaded from. Set by client. */
  public static set AssetBasePath(path: string) { AssetManager.assetBasePath = path; }

  /** Fonts available for 3D text */
  public static get Fonts(): FontDefinition[] { return AssetManager.fonts; }
  /** Fonts available for 3D text */
  public static set Fonts(fonts: FontDefinition[]) { AssetManager.fonts = fonts; }
}
