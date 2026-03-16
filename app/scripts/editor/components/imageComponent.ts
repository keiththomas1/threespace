import * as THREE from "three";
import { ComponentFactory } from "../../player/components/componentFactory";
import { ComponentType, ImageProperties } from "../../player/utils/playerDefinitions";
import { ComponentProperty } from "../utils/constants";
import BaseComponent from "./baseComponent";
import { SharedUtils } from "../../shared/sharedUtils";
import { SharedData } from "../../shared/sharedData";

export default class ImageComponent extends BaseComponent {
  private readonly DISPLAY_NAME = "Name";
  private readonly MATERIAL_REFLECTIVITY = "Shinyness";
  private readonly MATERIAL_COLOR = "Color";

  private readonly DEFAULT_COLOR = new THREE.Color(0xFFFFFF);

  protected imageProperties: ImageProperties = ImageComponent.DefaultProperties;

  private renderTarget: THREE.WebGLCubeRenderTarget | null;

  constructor(
    imageProperties: ImageProperties,
    renderTarget: THREE.WebGLCubeRenderTarget | null,
    editorCamera: THREE.Camera,
    dataURL: string = "") {
    super("ImageComponent", editorCamera, { hasActions: true, hasCredit: true, hasTransform: true, hasUrl: true, hasDuplicate: true });
    this.renderTarget = renderTarget;

    this.componentType = ComponentType.Image;
    this.assignProperties(imageProperties);
    this.setupEditorProperties();

    this.createImageMesh(dataURL === "" ? SharedUtils.GetURLFromComponentProperties(this.imageProperties) : dataURL);
  }

  public static get DefaultProperties() : ImageProperties {
    const defaultproperties = this.BaseDefaultProperties as ImageProperties;
    defaultproperties.componentType = ComponentType.Image;
    return defaultproperties;
  }
  
  /* Overridden player properties */
  public get ComponentProperties(): ImageProperties {
    return this.imageProperties;
  }

  public PropertyChanged(propertyName: string, property: ComponentProperty) {
    super.PropertyChanged(propertyName, property);

    switch (propertyName) {
      case this.DISPLAY_NAME:
        break;
      case this.MATERIAL_REFLECTIVITY:
        if (this.mesh && this.mesh instanceof THREE.Mesh) {
          this.mesh.material.roughness = (1 - property.value);
        }
        break;
      case this.MATERIAL_COLOR:
        if (this.mesh && this.mesh instanceof THREE.Mesh) {
          this.mesh.material.color = property.value;
        }
        break;
    }
  }

  protected setupEditorProperties(): void {
    super.setupEditorProperties(() => {
      this.editorProperties[this.MATERIAL_REFLECTIVITY] = { value: 0, type: "Number", min: 0, max: 1 };
      this.editorProperties[this.MATERIAL_COLOR] = { value: this.DEFAULT_COLOR, type: "Color" };
    });
  }

  private createImageMesh = (imageUrl: string) => {
    const self = this;
    this.mesh = ComponentFactory.CreateImageMesh(imageUrl, (mat: THREE.MeshBasicMaterial) => {
      if (self.renderTarget) mat.envMap = self.renderTarget.texture;
    });
    this.add(this.mesh);
  }
}