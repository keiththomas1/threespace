import * as THREE from "three";
import { ComponentProperty, DEFAULT_MATRIX_ARRAY } from "../utils/constants";
import BaseComponent from "./baseComponent";

import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import ThreeUtilities from "../utils/threeUtilities";
import { ComponentProperties, ComponentType, LightProperties, LightType } from "../../player/utils/playerDefinitions";
import PlayerUtils from "../../player/utils/playerUtils";

export default class LightComponent extends BaseComponent {
  private readonly DISPLAY_NAME = "Name";
  private readonly LIGHT_TYPE = "Type";
  private readonly LIGHT_INTENSITY = "Intensity";
  private readonly LIGHT_COLOR = "Color";

  private readonly INTENSITY_MULTIPLIER = 100;
  private static readonly DEFAULT_COLOR = new THREE.Color(0xFFFFFF);
  private static readonly DEFAULT_INTENSITY = 1;

  protected lightProperties: LightProperties = LightComponent.DefaultProperties;
  private assetBasePath: string = "";

  private light: THREE.Light | null = null;
  private lightModelSrc: string = "";
  private lightModelScale: THREE.Vector3 = new THREE.Vector3();

  constructor(lightProperties: LightProperties, assetPath: string = "") {
    super("LightComponent", null, { hasActions: false, hasCredit: false, hasTransform: true});

    this.componentType = ComponentType.Light;
    this.assetBasePath = assetPath;

    this.assignProperties(lightProperties);
    this.setupEditorProperties();

    this.createLight(lightProperties.type, assetPath);
    this.createLightModelRepresentation();
  }

  public static get DefaultProperties() : LightProperties {
    const defaultproperties = this.BaseDefaultProperties as LightProperties;
    defaultproperties.componentType = ComponentType.Light;
    defaultproperties.type = LightType.AMBIENT;
    defaultproperties.intensity = LightComponent.DEFAULT_INTENSITY;
    defaultproperties.color = PlayerUtils.getSerializableColorFromColor(LightComponent.DEFAULT_COLOR);
    return defaultproperties;
  }

  public get EditorProperties(): any {
    return this.editorProperties;
  }

  /* Overridden player properties */
  public get ComponentProperties(): LightProperties {
    return this.lightProperties;
  }

  public propertyChanged(propertyName: string, property: ComponentProperty) {
    super.propertyChanged(propertyName, property);

    switch (propertyName) {
      case this.LIGHT_TYPE:
        if (this.light) {
          this.remove(this.light);
          this.light.dispose();
        }
        if (this.mesh) {
          this.remove(this.mesh);
          ThreeUtilities.disposeAllChildren(this.mesh, false);
        }

        this.lightProperties.type = property.value;
        this.createLight(property.value as LightType, this.assetBasePath);
        this.createLightModelRepresentation();
        break;
      case this.LIGHT_COLOR:
        if (this.light) this.light.color = property.value as THREE.Color;
        this.lightProperties.color = property.value;
        break;
      case this.LIGHT_INTENSITY:
        this.lightProperties.intensity = property.value / this.INTENSITY_MULTIPLIER;
        if (this.light) this.light.intensity = this.lightProperties.intensity;
        break;
    }
  }

  public dispose(): void {
    super.dispose();
  }

  protected setupEditorProperties(): void {
    super.setupEditorProperties(() => {
      this.editorProperties[this.DISPLAY_NAME] = { value: "Light", type: "String" };
      this.editorProperties[this.LIGHT_TYPE] = { value: this.lightProperties.type, type: "Enum", enumType: LightType };
      this.editorProperties[this.LIGHT_INTENSITY] =
        { value: this.lightProperties.intensity * this.INTENSITY_MULTIPLIER, type: "Number", min: 0, max: 5 * this.INTENSITY_MULTIPLIER };
      this.editorProperties[this.LIGHT_COLOR] = { value: this.lightProperties.color, type: "Color" };
    });
  }

  private createLight(lightType: LightType, assetPath: string = "") {
    const color = PlayerUtils.getColorFromSerializableColor(this.lightProperties.color);
    switch (lightType) {
      case LightType.AMBIENT:
        this.light = new THREE.AmbientLight(color, this.lightProperties.intensity);
        this.add(this.light);
        this.light.position.set(0, 0, 0);
        this.light.rotation.set(0, 0, 0);
        this.lightModelSrc = `${assetPath}/models/lightbulb/lightbulb.glb`;
        this.lightModelScale.set(7, 7, 7);
        break;
      case LightType.DIRECTIONAL:
        this.light = new THREE.DirectionalLight(color, this.lightProperties.intensity);
        this.add(this.light);
        this.light.position.set(0, 0, 0);
        this.light.rotation.set(0, 0, 0);
        this.lightModelSrc = `${assetPath}/models/spotlight/spotlight.glb`;
        this.lightModelScale.set(10, 10, 5);
        break;
    }
  }

  private createLightModelRepresentation() {
    const gltfLoader = new GLTFLoader();
    const self = this;
    gltfLoader.load(this.lightModelSrc, (gltf: GLTF) => {
      ThreeUtilities.setBasicMaterialOnGLTF(gltf.scene);
      self.mesh = gltf.scene;
      this.add( self.mesh );
      self.mesh.position.set(0, 0, 0);
      self.mesh.scale.copy(this.lightModelScale);
    });
  }
}