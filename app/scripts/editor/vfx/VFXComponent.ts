import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VFXObject } from "../../player/components/VFXObject";
import { ComponentType, VFXProperties, VFXType } from "../../player/utils/playerDefinitions";
import PlayerUtils from "../../player/utils/playerUtils";
import { VFXData } from "../../player/utils/vfxInfo";
import BaseComponent from "../components/baseComponent";
import { ComponentProperty } from "../utils/constants";
import ThreeUtilities from "../utils/threeUtilities";

export default class VFXComponent extends BaseComponent {
  protected static DEFAULT_COLOR = new THREE.Color(0xFFFFFF);
  protected static DEFAULT_SPEED = 1;
  protected static DEFAULT_SIZE = 20;
  protected static DEFAULT_COUNT = 10;
  protected static DEFAULT_LIFETIME_MIN = 7;
  protected static DEFAULT_LIFETIME_MAX = 9;

  private readonly TEXTURE_PROPERTY = "Texture";
  private readonly COLOR_PROPERTY = "Color";
  private readonly SPEED_PROPERTY = "Speed";
  private readonly SIZE_PROPERTY = "Size";
  private readonly COUNT_PROPERTY = "Count";
  private readonly LIFETIME_MIN_PROPERTY = "Lifetime Minimum";
  private readonly LIFETIME_MAX_PROPERTY = "Lifetime Maximum";

  private static readonly SIZE_MULTIPLIER = 20;

  protected particleCount: number;

  protected vfxProperties: VFXProperties = VFXComponent.DefaultProperties;

  private vfxObject: VFXObject;

  constructor(vfxProperties: VFXProperties, vfxData: VFXData, assetPath: string = "") {
    super("VFX", null, { hasActions: false, hasCredit: false, hasTransform: true});

    this.particleCount = vfxProperties.count;

    this.componentType = ComponentType.VFX;
    this.assignProperties(vfxProperties);
    this.setupEditorProperties();

    this.vfxObject = new VFXObject(this.vfxProperties, vfxData);
    this.add(this.vfxObject);

    this.createModelRepresentation(assetPath);
  }

  public static get DefaultProperties() : VFXProperties {
    const defaultproperties = this.BaseDefaultProperties as VFXProperties;
    defaultproperties.componentType = ComponentType.VFX;
    defaultproperties.type = VFXType.Basic;
    defaultproperties.textureSrc = "";
    defaultproperties.color = PlayerUtils.getSerializableColorFromColor(this.DEFAULT_COLOR);
    defaultproperties.speed = this.DEFAULT_SPEED;
    defaultproperties.size = this.DEFAULT_SIZE / this.SIZE_MULTIPLIER;
    defaultproperties.count = this.DEFAULT_COUNT;
    defaultproperties.lifetimeMin = this.DEFAULT_LIFETIME_MIN;
    defaultproperties.lifetimeMax = this.DEFAULT_LIFETIME_MAX;
    return defaultproperties;
  }

  /* Overridden player properties */
  public get ComponentProperties(): VFXProperties { 
    return this.vfxProperties; 
  }

  public update = (deltaTime: number) => {
    this.vfxObject.update(deltaTime);
  }

  public propertyChanged(propertyName: string, property: ComponentProperty) {
    super.propertyChanged(propertyName, property);

    switch (propertyName) {
      case this.TEXTURE_PROPERTY:
        this.vfxProperties.color = property.value;
        this.colorChanged(new THREE.Color(property.value.r, property.value.g, property.value.b));
        break;
      case this.COLOR_PROPERTY:
        this.vfxProperties.color = property.value;
        this.colorChanged(new THREE.Color(property.value.r, property.value.g, property.value.b));
        break;
      case this.SIZE_PROPERTY:
        this.vfxProperties.size = property.value / VFXComponent.SIZE_MULTIPLIER;
        this.sizeChanged(this.vfxProperties.size);
        break;
      case this.SPEED_PROPERTY:
        this.vfxProperties.speed = property.value;
        this.speedChanged(property.value);
        break;
      case this.COUNT_PROPERTY:
        this.vfxProperties.count = property.value;
        this.countChanged(property.value);
        break;
      case this.LIFETIME_MIN_PROPERTY:
        this.vfxProperties.lifetimeMin = property.value;
        this.lifetimeMinChanged(property.value);
        break;
      case this.LIFETIME_MAX_PROPERTY:
        this.vfxProperties.lifetimeMax = property.value;
        this.lifetimeMaxChanged(property.value);
        break;
    }
  }

  protected setupEditorProperties() {
    super.setupEditorProperties(() => {
      this.editorProperties[this.COLOR_PROPERTY] = { value: this.vfxProperties.color, type: "Color" };
      this.editorProperties[this.SPEED_PROPERTY] = { value: this.vfxProperties.speed, type: "Number", min: -10, max: 10 };
      this.editorProperties[this.SIZE_PROPERTY] =
        { value: this.vfxProperties.size * VFXComponent.SIZE_MULTIPLIER, type: "Number", min: 0, max: 10 * VFXComponent.SIZE_MULTIPLIER };
      this.editorProperties[this.COUNT_PROPERTY] = { value: this.vfxProperties.count, type: "Number", min: 1, max: 300 };
      this.editorProperties[this.LIFETIME_MIN_PROPERTY] = { value: this.vfxProperties.lifetimeMin, type: "Number", min: 0, max: 20 };
      this.editorProperties[this.LIFETIME_MAX_PROPERTY] = { value: this.vfxProperties.lifetimeMax, type: "Number", min: 0, max: 20 };
    });
  }

  protected colorChanged = (color: THREE.Color) => {
    this.vfxObject.Color = color;
  }
  protected speedChanged = (speed: number) => {
    this.vfxObject.CurrentSpeed = speed;
  }
  protected sizeChanged = (size: number) => {
    this.vfxObject.CurrentSize = size;
  }
  protected countChanged = (count: number) => {
    this.vfxObject.CurrentCount = count;
  }
  protected lifetimeMinChanged = (min: number) => {
    this.vfxObject.CurrentLifetimeMin = min;
  }
  protected lifetimeMaxChanged = (max: number) => {
    this.vfxObject.CurrentLifetimeMax = max;
  }

  protected getRandomTimeValue() {
    return 0;
  }
  protected getRandomFactorValue() {
    return 0;
  }
  protected getRandomSpeedValue() {
    return 0;
  }
  protected getRandomXValue() {
    return 0;
  }
  protected getRandomYValue() {
    return 0;
  }
  protected getRandomZValue() {
    return 0;
  }

  private createModelRepresentation(assetPath: string = "") {
    const gltfLoader = new GLTFLoader();
    const self = this;
    gltfLoader.load(`${assetPath}/models/lightningBolt/lightningBolt.glb`, (gltf: GLTF) => {
      ThreeUtilities.setBasicMaterialOnGLTF(gltf.scene);
      self.mesh = gltf.scene;
      this.add( self.mesh );
      self.mesh.position.set(0, 0, 0);
      self.mesh.scale.set(0.01, 0.01, 0.01);
    });
  }
}