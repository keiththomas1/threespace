import { ComponentProperties } from "../player/utils/playerDefinitions";
import { AssetManager } from "./assetManager";

export class SharedUtils {

  public static GetURLFromComponentProperties(componentProperties: ComponentProperties): string {
    if (componentProperties.url != null && componentProperties.url !== "") {
      return SharedUtils.ResolveURL(componentProperties.url);
    } else if (componentProperties.filepath != null && componentProperties.filepath !== "") {
      return SharedUtils.ResolveURL(componentProperties.filepath);
    }

    console.warn("Asset has no URL or filepath in its properties", componentProperties);
    return "";
  }

  /** Prepends AssetBasePath to root-relative paths. Absolute URLs (http/https) are returned as-is. */
  private static ResolveURL(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${AssetManager.AssetBasePath}/${url}`;
  }
}