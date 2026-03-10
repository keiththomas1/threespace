import * as THREE from "three";
import { ComponentFactory } from "../../player/components/componentFactory";
import { AudioProperties, ComponentType, VideoProperties } from "../../player/utils/playerDefinitions";
import PlayerUtils from "../../player/utils/playerUtils";
import { ComponentProperty, DEFAULT_ACTION, DEFAULT_MATRIX_ARRAY, PREVIEW_LAYER } from "../utils/constants";
import BaseComponent from "./baseComponent";

export default class VideoComponent extends BaseComponent {
  private readonly DISPLAY_NAME = "Name";

  protected videoProperties: VideoProperties = VideoComponent.DefaultProperties;

  constructor(videoProperties: VideoProperties, editorCamera: THREE.Camera, dataURL: string = "") {
    super("VideoComponent", editorCamera, { hasActions: false, hasCredit: true, hasTransform: true});

    this.componentType = ComponentType.Video;
    this.assignProperties(videoProperties);
    this.setupEditorProperties();

    this.editorProperties[this.DISPLAY_NAME] = { value: this.videoProperties.url, type: "String" };

    this.createVideoMesh(dataURL === "" ? this.videoProperties.url : dataURL);
  }

  public static get DefaultProperties() : VideoProperties {
    const defaultproperties = this.BaseDefaultProperties as VideoProperties;
    defaultproperties.componentType = ComponentType.Video;
    return defaultproperties;
  }
  
  /* Overridden player properties */
  public get ComponentProperties(): VideoProperties {
    return this.videoProperties;
  }

  public propertyChanged(propertyName: string, property: ComponentProperty) {
    super.propertyChanged(propertyName, property);
    switch (propertyName) {
      case this.DISPLAY_NAME:
        break;
    }
  }

  private createVideoMesh = (url: string) => {
    const videoElement = ComponentFactory.createVideoElement(url);
    this.mesh = ComponentFactory.createVideoMesh(videoElement);
    this.mesh.layers.set(PREVIEW_LAYER);
    this.add(this.mesh);
  }
}