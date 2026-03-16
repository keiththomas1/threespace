import * as THREE from "three";
import { BackgroundColorType, ComponentType, SceneProperties } from "../../player/utils/playerDefinitions";
import PlayerUtils from "../../player/utils/playerUtils";
import { ComponentProperty } from "../utils/constants";
import BaseComponent from "./baseComponent";

export default class SettingsComponent extends BaseComponent {
  private readonly RESET_SCENE = "Reset Scene";
  private readonly BACKGROUND_TYPE = "Background Type";
  private readonly FIRST_COLOR = "First Color";
  private readonly SECOND_TYPE = "Second Color";
  private readonly GRID_ENABLED = "Grid Snap";
  private readonly GRID_SIZE = "Grid Size";

  protected settingsProperties: SceneProperties = SettingsComponent.DefaultProperties;
  protected editorProperties: any = {};
  protected componentType: string;

  private settingsChanged: () => any;
  private resetScene: () => any;
  private gridModeUpdated: (enabled: boolean, size: number) => any;

  constructor(sceneProperties: SceneProperties, settingsChanged: () => any, resetScene: () => any, gridModeUpdated: (enabled: boolean, size: number) => any) {
    super("Scene Settings", null, { hasActions: false, hasCredit: false, hasTransform: false});

    this.componentType = ComponentType.Settings;
    Object.assign(this.settingsProperties, sceneProperties);
    this.canDelete = false;

    this.settingsChanged = settingsChanged;
    this.resetScene = resetScene;
    this.gridModeUpdated = gridModeUpdated;
  }

  public get ComponentType(): string {
    return this.componentType;
  }

  public static get DefaultProperties() : SceneProperties {
    return {
      componentType: ComponentType.Settings,
      backgroundColorType: BackgroundColorType.Gradient,
      colorOne: PlayerUtils.GetSerializableColorFromColor(new THREE.Color("aqua")),
      colorTwo: PlayerUtils.GetSerializableColorFromColor(new THREE.Color("purple")),
      gridEnabled: false,
      gridSize: 1,
    };
  }

  public get SettingsProperties(): SceneProperties {
    return this.settingsProperties;
  }

  public set SettingsProperties(sceneProperties: SceneProperties) {
    this.settingsProperties = SettingsComponent.DefaultProperties;
    Object.assign(this.settingsProperties, sceneProperties);

    this.editorProperties[this.RESET_SCENE] = {
      value: this.resetScene,
      type: "Button",
      tooltip: "" };
    this.editorProperties[this.BACKGROUND_TYPE] =
      { value: this.settingsProperties.backgroundColorType, type: "Enum", enumType: BackgroundColorType };
    this.editorProperties[this.FIRST_COLOR] = { value: this.settingsProperties.colorOne, type: "Color" };
    this.editorProperties[this.SECOND_TYPE] = { value: this.settingsProperties.colorTwo, type: "Color" };
    this.editorProperties[this.GRID_ENABLED] = {
      value: this.settingsProperties.gridEnabled ?? false,
      type: "Boolean"
    };
    this.editorProperties[this.GRID_SIZE] = {
      value: this.settingsProperties.gridSize ?? 1,
      type: "Number", min: 0.1, max: 20, step: 0.1
    };
  }

  public PropertyChanged(propertyName: string, property: ComponentProperty) {
    switch (propertyName) {
      case this.BACKGROUND_TYPE:
        this.settingsProperties.backgroundColorType = property.value;
        break;
      case this.FIRST_COLOR:
        this.settingsProperties.colorOne =
          PlayerUtils.GetSerializableColorFromColor(new THREE.Color(property.value.r, property.value.g, property.value.b));
        break;
      case this.SECOND_TYPE:
        this.settingsProperties.colorTwo =
          PlayerUtils.GetSerializableColorFromColor(new THREE.Color(property.value.r, property.value.g, property.value.b));
        break;
      case this.GRID_ENABLED:
        this.settingsProperties.gridEnabled = property.value;
        this.gridModeUpdated(this.settingsProperties.gridEnabled, this.settingsProperties.gridSize);
        break;
      case this.GRID_SIZE:
        this.settingsProperties.gridSize = property.value;
        this.gridModeUpdated(this.settingsProperties.gridEnabled, this.settingsProperties.gridSize);
        break;
    }

    this.settingsChanged();
  }
}