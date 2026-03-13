import * as THREE from "three";
import { Color } from "three";
import { ComponentFactory } from "../../player/components/componentFactory";
import { ComponentType, Text3DProperties, TEXT3D_FRONT_MAT_NAME, TEXT3D_SIDE_MAT_NAME } from "../../player/utils/playerDefinitions";
import { AssetManager } from "../../shared/assetManager";
import PlayerUtils from "../../player/utils/playerUtils";
import { ComponentProperty, DEFAULT_ACTION, DEFAULT_MATRIX_ARRAY, PREVIEW_LAYER } from "../utils/constants";
import ThreeUtilities from "../utils/threeUtilities";
import BaseComponent from "./baseComponent";

export default class Text3DComponent extends BaseComponent {
  private readonly DISPLAY_NAME = "Text";
  private readonly FRONT_COLOR = "Face Color";
  private readonly BACK_COLOR = "Side Color";
  private readonly FONT_SIZE = "Font Size";
  private readonly FONT_THICKNESS = "Font Thickness";
  private readonly FONT_FAMILY = "Font Family";

  private static readonly DEFAULT_FONT_SIZE = 32;
  private static readonly DEFAULT_FONT_THICKNESS = 4;
  private static readonly DEFAULT_FRONT_COLOR = new THREE.Color(0x00AAAA);
  private static readonly DEFAULT_SIDE_COLOR = new THREE.Color(0x000000);

  protected textProperties: Text3DProperties = Text3DComponent.DefaultProperties;

  private frontMaterial: THREE.MeshBasicMaterial | null = null;
  private sideMaterial: THREE.MeshBasicMaterial | null = null;

  private currentPromises: Promise<THREE.Mesh>[] = [];

  constructor(textProperties: Text3DProperties, editorCamera: THREE.Camera) {
    super("Text3DComponent", editorCamera, { hasActions: true, hasCredit: false, hasTransform: true});

    this.componentType = ComponentType.Text3D;
    this.assignProperties(textProperties);
    this.setupEditorProperties();

    this.loadTextMesh();
  }

  public static get DefaultProperties() : Text3DProperties {
    const defaultproperties = this.BaseDefaultProperties as Text3DProperties;
    defaultproperties.componentType = ComponentType.Text3D;
    defaultproperties.text = "";
    defaultproperties.size = this.DEFAULT_FONT_SIZE;
    defaultproperties.thickness = this.DEFAULT_FONT_THICKNESS;
    defaultproperties.height = this.DEFAULT_FONT_THICKNESS;
    defaultproperties.frontColor = PlayerUtils.GetSerializableColorFromColor(this.DEFAULT_FRONT_COLOR);
    defaultproperties.sideColor = PlayerUtils.GetSerializableColorFromColor(this.DEFAULT_SIDE_COLOR);
    return defaultproperties;
  }

  /* Overridden player properties */
  public get ComponentProperties(): Text3DProperties {
    return this.textProperties;
  }

  public PropertyChanged(propertyName: string, property: ComponentProperty) {
    super.PropertyChanged(propertyName, property);

    switch (propertyName) {
      case this.DISPLAY_NAME:
        this.textProperties.text = property.value;
        this.reloadTextMesh();
        break;
      case this.FRONT_COLOR:
        if (this.frontMaterial) this.frontMaterial.color = property.value as THREE.Color;
        this.textProperties.frontColor = new Color(property.value.r, property.value.g, property.value.b);
        break;
      case this.BACK_COLOR:
        if (this.sideMaterial) this.sideMaterial.color = property.value as THREE.Color;
        this.textProperties.sideColor = new Color(property.value.r, property.value.g, property.value.b);
        break;
      case this.FONT_SIZE:
        this.textProperties.size = property.value;
        this.reloadTextMesh();
        break;
      case this.FONT_THICKNESS:
        this.textProperties.height = property.value;
        this.reloadTextMesh();
        break;
      case this.FONT_FAMILY:
        this.textProperties.type = property.value;
        this.reloadTextMesh();
        break;
    }
  }

  protected setupEditorProperties() {
    // Build an ad-hoc options object from injected fonts so the existing ENUM_TYPE
    // dropdown renderer can derive its option list via Object.values().
    const fontOptions = Object.fromEntries(AssetManager.Fonts.map(f => [f.name, f.name]));
    super.setupEditorProperties(() => {
      this.editorProperties[this.DISPLAY_NAME] = { value: this.textProperties.text, type: "String" };
      this.editorProperties[this.FONT_FAMILY] = { value: this.textProperties.type, type: "Enum", enumType: fontOptions };
      this.editorProperties[this.FONT_SIZE] = { value: this.textProperties.size, type: "Number", min: 2, max: 128 };
      this.editorProperties[this.FONT_THICKNESS] = { value: this.textProperties.thickness, type: "Number", min: 0, max: 16 };
      this.editorProperties[this.FRONT_COLOR] = { value: this.textProperties.frontColor, type: "Color" };
      this.editorProperties[this.BACK_COLOR] = { value: this.textProperties.sideColor, type: "Color" };
    });
  }

  private loadTextMesh() {
    const promise = ComponentFactory.Create3DTextMesh(this.textProperties, this);
    promise.then(
      (textMesh: THREE.Mesh) => {
        this.mesh = textMesh;
        textMesh.layers.set(PREVIEW_LAYER);

        const materials = textMesh.material as THREE.MeshBasicMaterial[];
        for (let i = 0; i < materials.length; i++) {
          if (materials[i].name === TEXT3D_FRONT_MAT_NAME) {
            this.frontMaterial = materials[i];
          } else if (materials[i].name === TEXT3D_SIDE_MAT_NAME) {
            this.sideMaterial = materials[i];
          }
        }
      }
    );

    this.currentPromises.push(promise);
  }

  private reloadTextMesh() {
    if (this.mesh) {
      this.remove(this.mesh);
      ThreeUtilities.disposeAllChildren(this.mesh, true);
    }

    for (let i = 0; i < this.currentPromises.length; i++) {
      this.currentPromises[i].then(
        (textMesh: THREE.Mesh) => {
          this.remove(textMesh);
          ThreeUtilities.disposeAllChildren(textMesh, true);
        }
      );
    }

    this.loadTextMesh();
  }
}
