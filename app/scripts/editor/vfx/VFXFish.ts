import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import VFXFishObject from "../../player/components/vfxFishObject";

import { VFXProperties, ComponentType, VFXType } from "../../player/utils/playerDefinitions";
import PlayerUtils from "../../player/utils/playerUtils";
import BaseComponent from "../components/baseComponent";
import { ComponentProperty } from "../utils/constants";
import ThreeUtilities from "../utils/threeUtilities";

export default class VFXFish extends BaseComponent {
  protected static DEFAULT_COLOR = new THREE.Color(0xFFFFFF);

  private readonly COLOR_PROPERTY = "Color";

  protected vfxProperties: VFXProperties = VFXFish.DefaultProperties;

  private vfxFishObject: VFXFishObject;

  constructor(vfxProperties: VFXProperties, renderer: THREE.WebGLRenderer, assetPath: string = "") {
    super("VFX", null, { hasActions: false, hasCredit: false, hasTransform: true});
    vfxProperties.type = VFXType.Fish;

    this.componentType = ComponentType.VFX;
    this.assignProperties(vfxProperties);
    this.setupEditorProperties();

    this.vfxFishObject = new VFXFishObject({}, renderer);
    this.add(this.vfxFishObject);

    this.createModelRepresentation(assetPath);
  }

  public static get DefaultProperties() : VFXProperties {
    const defaultproperties = this.BaseDefaultProperties as VFXProperties;
    defaultproperties.componentType = ComponentType.VFX;
    defaultproperties.color = PlayerUtils.GetSerializableColorFromColor(this.DEFAULT_COLOR);
    return defaultproperties;
  }

  /* Overridden player properties */
  public get ComponentProperties(): VFXProperties { 
    return this.vfxProperties; 
  }

  public update = (deltaTime: number) => {
    this.vfxFishObject.Update(deltaTime);
  }

  public PropertyChanged(propertyName: string, property: ComponentProperty) {
    super.PropertyChanged(propertyName, property);

    switch (propertyName) {
      case this.COLOR_PROPERTY:
        this.vfxProperties.color = property.value;
        this.colorChanged(new THREE.Color(property.value.r, property.value.g, property.value.b));
        break;
    }
  }

  protected setupEditorProperties() {
    super.setupEditorProperties(() => {
      this.editorProperties[this.COLOR_PROPERTY] = { value: this.vfxProperties.color, type: "Color" };
    });
  }

  protected colorChanged = (color: THREE.Color) => {
    //  this.vfxObject.Color = color;
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