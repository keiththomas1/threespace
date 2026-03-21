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

  /** Prepends AssetBasePath to root-relative paths and validates them. Absolute URLs (http/https) are returned as-is. */
  private static ResolveURL(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    
    const base = AssetManager.AssetBasePath.replace(/\/+$/, ''); // Remove leading and trailing slashes
    const path = url.startsWith('/') ? url : '/' + url; // Add a path separator if not present
    return `${base}${path}`;
  }
}