import { FontDefinition } from '../player/utils/playerDefinitions';

export class AssetManager {
  private static assetBasePath: string = '';
  private static fonts: FontDefinition[] = [];

  public static get AssetBasePath(): string { return AssetManager.assetBasePath; }
  public static set AssetBasePath(path: string) { AssetManager.assetBasePath = path; }

  public static get Fonts(): FontDefinition[] { return AssetManager.fonts; }
  public static set Fonts(fonts: FontDefinition[]) { AssetManager.fonts = fonts; }
}
