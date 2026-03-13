import { ComponentProperties } from "../player/utils/playerDefinitions";

export class SharedUtils {
  
  public static GetURLFromComponentProperties(componentProperties: ComponentProperties): string {
    if (componentProperties.url != null && componentProperties.url !== "") {
      return componentProperties.url;
    } else if (componentProperties.filepath != null && componentProperties.filepath !== "") {
      return componentProperties.filepath;
    }

    console.warn("Asset has no URL or filepath in its properties", componentProperties);
    return "";
  }
}