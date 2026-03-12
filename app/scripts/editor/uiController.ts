import * as THREE from "three";
import * as AColorPicker from 'a-color-picker';
import { EditorIds } from './editorIds';

import BaseComponent from "./components/baseComponent";
import Text3DComponent from "./components/text3DComponent";
import ComponentManager from "./componentManager";
import PropertiesWindow from "./ui/propertiesWindow";
import { ComponentProperty } from "./utils/constants";
import WebpageComponent from "./components/webpageComponent";
export default class UiController {
  private propertiesWindow: PropertiesWindow;

  private colorPickerParent: HTMLElement | null;
  private objectToolbar: HTMLElement | null;

  private roomGroup: THREE.Group;
  private editorCamera: THREE.Camera;
  private colorPicker: any;

  private componentAdded: (component: BaseComponent) => any;
  private togglePreviewMode: (inPreview: boolean) => any;
  private sceneCleared: () => any;
  private sceneSaved: () => any;
  private colorPickerChanged: (_: any, color: any) => any;

  constructor(
    roomGroup: THREE.Group,
    editorCamera: THREE.Camera,
    componentManager: ComponentManager,
    componentAdded: (component: BaseComponent) => any,
    togglePreviewMode: (inPreview: boolean) => any,
    sceneCleared: () => any,
    sceneSaved: () => any) {
    this.roomGroup = roomGroup;
    this.editorCamera = editorCamera;

    this.colorPickerParent = document.getElementById(EditorIds.colorPickerParent);
    this.componentAdded = componentAdded;
    this.togglePreviewMode = togglePreviewMode;
    this.sceneCleared = sceneCleared;
    this.sceneSaved = sceneSaved;

    this.propertiesWindow = new PropertiesWindow(
      (component: BaseComponent) => {
        componentManager.removeComponent(component);
      },
      (baseComponent: BaseComponent, componentProperty: ComponentProperty, propertyName: string) => {
        // Need to reset the following so as not to affect last callback.
        this.colorPickerChanged = () => {};

        const color:number[] = [
          componentProperty.value.r * 255,
          componentProperty.value.g * 255,
          componentProperty.value.b * 255];
        this.colorPicker.rgb = color;

        this.ShowColorPicker();
        this.colorPickerChanged = (_: any, color: any) => {
          const rgb = color.match(/\d+/g);
          componentProperty.value = new THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
          baseComponent.PropertyChanged(propertyName, componentProperty);
        };
      }
    );
    this.objectToolbar = document.getElementById(EditorIds.objectToolbar);

    this.colorPicker = AColorPicker.from('#' + EditorIds.colorPicker)[0];
    this.colorPickerChanged = (_: any, color: any) => {};
    this.colorPicker.on('change', this.OnColorPickerChanged);

    const objectSelectButton = document.getElementById(EditorIds.objectSelectButton);
    if (objectSelectButton) {
      objectSelectButton.addEventListener("click", () => {
        componentManager.setMode("");
      });
    }
    const objectMoveButton = document.getElementById(EditorIds.objectMoveButton);
    if (objectMoveButton) {
      objectMoveButton.addEventListener("click", () => {
        componentManager.setMode("translate");
      });
    }
    const objectRotateButton = document.getElementById(EditorIds.objectRotateButton);
    if (objectRotateButton) {
      objectRotateButton.addEventListener("click", () => {
        componentManager.setMode("rotate");
      });
    }
    const objectScaleButton = document.getElementById(EditorIds.objectScaleButton);
    if (objectScaleButton) {
      objectScaleButton.addEventListener("click", () => {
        componentManager.setMode("scale");
      });
    }

    const textInputPopupParent = document.getElementById(EditorIds.textInputPopupParent);
    const textInputPopupForm = document.getElementById(EditorIds.textInputPopupForm);
    if (textInputPopupForm) {
      textInputPopupForm.addEventListener('submit', (e: SubmitEvent) => {
        e.preventDefault();

        if (textInputPopupParent) {
          textInputPopupParent.style.visibility = "hidden";
        }

        const textInputPopupInput = document.getElementById(EditorIds.textInputPopupInput) as HTMLInputElement;
        if (textInputPopupInput) {
          this.AddTextComponent(textInputPopupInput.value);
        }
      });
    }

    const addTextButton = document.getElementById(EditorIds.addTextButton);
    if (addTextButton) {
      addTextButton.addEventListener("click", () => {
        if (textInputPopupParent) {
          textInputPopupParent.style.visibility = "visible";
        }
      });
    }

    const add2DPageButton = document.getElementById(EditorIds.add2DPageButton);
    if (add2DPageButton) {
      add2DPageButton.onclick = () => {
        this.CreateWebpageComponent();
      };
    }

    const previewBackButton = document.getElementById(EditorIds.previewBackButton);
    if (previewBackButton) {
      previewBackButton.addEventListener("click", () => {
        if (previewBackButton) {
          previewBackButton.style.visibility = "hidden";
        }
        this.togglePreviewMode(false);
      });
    }

    const previewButton = document.getElementById(EditorIds.previewButton);
    if (previewButton) {
      previewButton.addEventListener("click", () => {
        if (previewBackButton) {
          previewBackButton.style.visibility = "visible";
        }
        this.togglePreviewMode(true);
      });
    }

    const resetSceneYesButton = document.getElementById(EditorIds.resetSceneYesButton);
    if (resetSceneYesButton) {
      resetSceneYesButton.addEventListener("click", this.clearScene);
    }
    const resetSceneNoButton = document.getElementById(EditorIds.resetSceneNoButton);
    if (resetSceneNoButton) {
      resetSceneNoButton.addEventListener("click", () => { this.SetResetScenePopupVisibility("hidden"); });
    }

    const saveButton = document.getElementById(EditorIds.saveButton);
    if (saveButton) {
      saveButton.addEventListener("click", this.sceneSaved);
    }
  }

  public ResetUIState = () => {
    if (this.colorPickerParent) {
      this.colorPickerParent.style.visibility = "hidden";
    }
  }

  public ShowPropertiesWindow = (baseComponent: BaseComponent) => {
      this.propertiesWindow.showPropertiesWindow(baseComponent);
  }

  public HidePropertiesWindow = () => {
    this.propertiesWindow.hidePropertiesWindow();
  }

  public Show3DToolsWindow = () => {
    if (this.objectToolbar) {
      this.objectToolbar.classList.remove("fade-out-quick");
      this.objectToolbar.classList.add("fade-in");
    }
  }

  public Hide3DToolsWindow = () => {
    if (this.objectToolbar) {
      if (this.objectToolbar.classList.contains("fade-in")) {
        this.objectToolbar.classList.remove("fade-in");
        this.objectToolbar.classList.add("fade-out-quick");
      }
    }
  }

  public SetResetScenePopupVisibility = (visibility: string) => {
    const resetScenePopupParent = document.getElementById(EditorIds.resetScenePopupParent);
    if (resetScenePopupParent) {
      resetScenePopupParent.style.visibility = visibility;
    }
  }

  private ShowColorPicker() {
    if (this.colorPickerParent) {
      this.colorPickerParent.style.visibility = (this.colorPickerParent.style.visibility === "visible") ? "hidden" : "visible";
    }
  }

  private OnColorPickerChanged = (_: any, color: any) => {
    this.colorPickerChanged(_, color);
  }

  private AddTextComponent = (text: string) => {
    const textProperties = Text3DComponent.DefaultProperties;
    textProperties.text = text;
    const textComponent = new Text3DComponent(textProperties, this.editorCamera);
    textComponent.scale.set(0.025, 0.025, 0.025);
    this.roomGroup.add(textComponent);
    this.componentAdded(textComponent);
  }

  private CreateWebpageComponent = () => {
    const properties = WebpageComponent.DefaultProperties;
    const webpageComponent = new WebpageComponent(properties, this.editorCamera);
    this.roomGroup.add(webpageComponent);
    this.componentAdded(webpageComponent);
  }

  private clearScene = () => {
    this.sceneCleared();

    this.SetResetScenePopupVisibility("hidden");
  }
}