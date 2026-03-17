import * as THREE from "three";
import { ComponentFactory } from "../../player/components/componentFactory";
import { ComponentType, VideoProperties } from "../../player/utils/playerDefinitions";
import { ComponentProperty } from "../utils/constants";
import BaseComponent from "./baseComponent";
import { SharedUtils } from "../../shared/sharedUtils";
import { SharedData } from "../../shared/sharedData";

export default class VideoComponent extends BaseComponent {
  private readonly DISPLAY_NAME = "Name";

  protected videoProperties: VideoProperties = VideoComponent.DefaultProperties;

  constructor(videoProperties: VideoProperties, editorCamera: THREE.Camera, dataURL: string = "") {
    super("VideoComponent", editorCamera, { hasActions: false, hasCredit: true, hasTransform: true, hasUrl: true, hasDuplicate: true });

    this.componentType = ComponentType.Video;
    this.assignProperties(videoProperties);
    this.setupEditorProperties();

    this.editorProperties[this.DISPLAY_NAME] = { value: this.videoProperties.url, type: "String" };

    this.CreateVideoMesh(dataURL === "" ? SharedUtils.GetURLFromComponentProperties(this.videoProperties) : dataURL);
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

  public PropertyChanged(propertyName: string, property: ComponentProperty) {
    super.PropertyChanged(propertyName, property);
    switch (propertyName) {
      case this.DISPLAY_NAME:
        break;
    }
  }

  private CreateVideoMesh = (url: string) => {
    const videoElement = ComponentFactory.CreateVideoElement(url);
    this.mesh = ComponentFactory.CreateVideoMesh(videoElement);
    this.add(this.mesh);
  }
}