import * as THREE from "three";
import { ComponentFactory } from "../../player/components/componentFactory";
import { ComponentProperties, ComponentType, ImageProperties } from "../../player/utils/playerDefinitions";
import { ComponentProperty, PREVIEW_LAYER } from "../utils/constants";
import ThreeUtilities from "../utils/threeUtilities";
import BaseComponent from "./baseComponent";

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
    super("ImageComponent", editorCamera, { hasActions: true, hasCredit: true, hasTransform: true});
    this.renderTarget = renderTarget;

    this.componentType = ComponentType.Image;
    this.assignProperties(imageProperties);
    this.setupEditorProperties();

    this.createImageMesh(dataURL === "" ? this.imageProperties.url : dataURL);
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

  public propertyChanged(propertyName: string, property: ComponentProperty) {
    super.propertyChanged(propertyName, property);

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
    this.mesh = ComponentFactory.createImageMesh(imageUrl, (mat: THREE.MeshBasicMaterial) => {
      if (self.renderTarget) mat.envMap = self.renderTarget.texture;
    });
    this.mesh.layers.set(PREVIEW_LAYER);

    this.add(this.mesh);
  }
}