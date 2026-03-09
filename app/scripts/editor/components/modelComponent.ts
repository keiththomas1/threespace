import * as THREE from "three";
import { AnimationClip } from "three";
import { ComponentFactory } from "../../player/components/componentFactory";
import { AnimationBehaviorType, ComponentType, ModelInfo, ModelProperties } from "../../player/utils/playerDefinitions";
import ModelLoader from "../../player/modelLoader";
import { ComponentProperty, DEFAULT_ACTION, DEFAULT_MATRIX_ARRAY, PREVIEW_LAYER } from "../utils/constants";
import ThreeUtilities from "../utils/threeUtilities";
import BaseComponent from "./baseComponent";

export default class ModelComponent extends BaseComponent {
  private readonly CURRENT_ANIMATION = "Selected Animation";
  private readonly ANIMATION_BEHAVIOR_TYPE = "Animation Behavior";

  private animationMixer: THREE.AnimationMixer | null = null;
  private onLoaded: (component: ModelComponent) => any;

  protected playerProperties: ModelProperties = ModelComponent.DefaultProperties;

  constructor(
    modelProperties: ModelProperties, editorCamera: THREE.Camera,
    onLoaded:(component: ModelComponent)=>any = ()=>{}, dataURL: string = "") {
    super("MeshComponent", editorCamera, { hasActions: true, hasCredit: true, hasTransform: true});

    this.componentType = ComponentType.Model;
    this.onLoaded = onLoaded;
    this.assignProperties(modelProperties);
    this.setupEditorProperties();

    const loader = new THREE.LoadingManager();
    const modelLoader = new ModelLoader(loader);

    if (dataURL !== "") {
      modelLoader.loadGLTFFromURL(dataURL, this.loadModelInfo);
    } else {
      modelLoader.loadGLTFFromURL(this.playerProperties.url, this.loadModelInfo);
    }
  }

  private loadModelInfo = (modelInfo: ModelInfo) => {
    if (modelInfo) {
      const model = modelInfo.object;
      model.traverse( function( child ) { child.layers.set( PREVIEW_LAYER ) } );
      this.add(model);

      if (modelInfo.animations && modelInfo.animations.length > 0) {
        const animationNames = [];
        for (let i = 0; i < modelInfo.animations.length; i++) {
            animationNames.push(modelInfo.animations[i].name.toLocaleLowerCase());
        }
        this.editorProperties[this.CURRENT_ANIMATION] = { value: animationNames, type: "List" };
        this.editorProperties[this.ANIMATION_BEHAVIOR_TYPE] =
          { value: this.playerProperties.animationBehaviorType, type: "Enum", enumType: AnimationBehaviorType };

        this.setupAnimationMixer(model, modelInfo.animations);
      }

      this.mesh = model;
      this.onLoaded(this);
    }
  }

  public static get DefaultProperties() : ModelProperties {
    const defaultproperties = this.BaseDefaultProperties as ModelProperties;
    defaultproperties.componentType = ComponentType.Model;
    defaultproperties.animationBehaviorType = AnimationBehaviorType.PLAY_ON_START;
    defaultproperties.currentAnimationName = "";
    return defaultproperties;
  }

  public get PlayerProperties(): ModelProperties {
    return this.playerProperties;
  }

  public propertyChanged(propertyName: string, property: ComponentProperty) {
    super.propertyChanged(propertyName, property);

    switch (propertyName) {
      case this.CURRENT_ANIMATION:
        this.playerProperties.currentAnimationName = property.value;
        this.playAnimationName(property.value);
        break;
      case this.ANIMATION_BEHAVIOR_TYPE:
        this.playerProperties.animationBehaviorType = property.value;
        break;
    }
  }

  public update(deltaTime: number) {
    super.update(deltaTime);

    if (this.animationMixer) {
      this.animationMixer.update(deltaTime);
    }
  }

  protected setupEditorProperties(): void {
    super.setupEditorProperties();
  }

  private setupAnimationMixer(root: THREE.Object3D, animationClips: AnimationClip[]) {
    if (animationClips.length == 0) {
      return;
    }

    this.animationMixer = new THREE.AnimationMixer(root);
    this.animations = animationClips;
    this.playAnimationName(animationClips[0].name);
    this.playerProperties.currentAnimationName = animationClips[0].name;
  }

  private playAnimationName = (animationName: string) => {
    if (!this.animationMixer) {
      return;
    }

    for (let i = 0; i < this.animations.length; i++) {
      if (this.animations[i].name === animationName) {
        const action = this.animationMixer.clipAction(this.animations[i]);
        action.play();
      }
    }
  }
}