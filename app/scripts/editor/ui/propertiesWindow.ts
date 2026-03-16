import { EditorIds, EditorClasses } from '../editorIds';
import { ActionType, AnimationBehaviorType, BackgroundColorType, CameraType, LightType } from "../../player/utils/playerDefinitions";
import BaseComponent from "../components/baseComponent";
import { ActionProperty, ComponentProperty, CreditProperty, TransformProperty, UrlPathType, UrlProperty } from "../utils/constants";
import { AssetManager } from '../..';

export default class PropertiesWindow {
  private readonly ALTERNATE_COLOR_ONE = "#222";
  private readonly ALTERNATE_COLOR_TWO = "#444";

  private propertiesWindow: HTMLElement | null;
  private inEditorMode: boolean = true;
  private alternatingOn: boolean = true;
  private currentTransformSection: HTMLElement = null;
  private currentComponent: BaseComponent = null;

  public onComponentDeleted: (baseComponent: BaseComponent) => any;
  public onShowColorPicker: (baseComponent: BaseComponent, componentProperty: ComponentProperty, propertyName: string) => any;

  constructor(
    onComponentDeleted: (baseComponent: BaseComponent) => any,
    onShowColorPicker: (baseComponent: BaseComponent, componentProperty: ComponentProperty, propertyName: string) => any) {
    this.onComponentDeleted = onComponentDeleted;
    this.onShowColorPicker = onShowColorPicker;

    this.propertiesWindow = document.getElementById(EditorIds.propertiesWindow);
  }

  set InEditorMode(inEditorMode: boolean) {
    this.inEditorMode = inEditorMode;
  }

  public showPropertiesWindow = (baseComponent: BaseComponent) => {
    if (!this.inEditorMode) {
      return;
    }
    if (!this.propertiesWindow) {
      console.warn("Can't find properties window");
      return;
    }
    this.alternatingOn = true;

    if (this.currentComponent) this.currentComponent.OnTransformChanged = null;
    baseComponent.OnTransformChanged = this.updateTransformSection;

    this.currentTransformSection = null;
    while (this.propertiesWindow.firstChild) {
      this.propertiesWindow.removeChild(this.propertiesWindow.firstChild);
    }

    const header = document.createElement("p");
    header.id = "propertiesWindowHeader";
    header.innerHTML = baseComponent.ComponentType; // "Properties"
    this.propertiesWindow.appendChild(header);

    if (baseComponent.CanDelete) {
      const deleteButton = document.createElement("button");
      deleteButton.onclick = () => {
        this.onComponentDeleted(baseComponent);
        this.hidePropertiesWindow();
      };
      deleteButton.innerHTML = "Delete";

      this.propertiesWindow.appendChild(deleteButton);
    }

    for (const [name, property] of Object.entries(baseComponent.EditorProperties)) {
      const componentProperty = property as ComponentProperty;
      let section: HTMLElement | null = null;
      switch (componentProperty.type) {
        case BaseComponent.STRING_TYPE:
          section = this.createInputTextSection(baseComponent, name, componentProperty);
          break;
        case BaseComponent.COLOR_TYPE:
          section = this.createColorPickerSection(baseComponent, name, componentProperty);
          break;
        case BaseComponent.NUMBER_TYPE:
          section = this.createNumberSliderSection(baseComponent, name, componentProperty);
          break;
        case BaseComponent.VECTOR3_TYPE:
          section = this.createVector3Section(baseComponent, name, componentProperty);
          break;
        case BaseComponent.BOOLEAN_TYPE:
          section = this.createCheckboxSection(baseComponent, name, componentProperty);
          break;
        case BaseComponent.LIST_TYPE:
          section = this.createDropdownSection(baseComponent, componentProperty.value, name, name, componentProperty);
          break;
        case BaseComponent.ENUM_TYPE:
          section = this.createEnumSection(componentProperty.enumType, baseComponent, name, name, componentProperty);
          break;
        case BaseComponent.BUTTON_TYPE:
          section = this.createButtonSection(name, componentProperty);
          break;
        case BaseComponent.TRANSFORM_TYPE:
          section = this.createTransformSection(baseComponent, componentProperty);
          this.currentTransformSection = section;
          break;
        case BaseComponent.ACTION_TYPE:
          section = this.createActionSection(baseComponent, componentProperty);
          break;
        case BaseComponent.CREDIT_TYPE:
          section = this.createCreditSection(baseComponent, componentProperty);
          break;
        case BaseComponent.URL_TYPE:
          section = this.createUrlSection(baseComponent, componentProperty);
          break;
      }

      if (section) {
        this.propertiesWindow.appendChild(section);
      }
    }

    this.propertiesWindow.classList.remove("slide-out-right");
    this.propertiesWindow.classList.add("slide-in-right");

    this.currentComponent = baseComponent;
  }

  public hidePropertiesWindow = () => {
    if (this.propertiesWindow && this.propertiesWindow.classList.contains("slide-in-right")) {
      this.propertiesWindow.classList.remove("slide-in-right");
      this.propertiesWindow.classList.add("slide-out-right");
    }
  }

  private updateTransformSection = (baseComponent: BaseComponent) => {
    if (this.currentTransformSection && this.propertiesWindow.contains(this.currentTransformSection)) {
      const newSection = this.createTransformSection(
        baseComponent, baseComponent.EditorProperties[BaseComponent.TRANSFORM_TYPE]);

      this.propertiesWindow.replaceChild(newSection, this.currentTransformSection);
      this.currentTransformSection = newSection;
    }
  }

  private createPropertySection(propertyName: string, optionalTextTag: string = "p") {
    const propertySection = document.createElement("div");
    propertySection.className = EditorClasses.propertyRow;

    propertySection.style.background = this.alternatingOn ?
      this.ALTERNATE_COLOR_ONE : this.ALTERNATE_COLOR_TWO;
    this.alternatingOn = !this.alternatingOn;

    if (propertyName !== "") {
      const textLabel = document.createElement(optionalTextTag);
      textLabel.innerHTML = propertyName;
      textLabel.style.paddingRight = "5px";
      textLabel.style.height = "5px";
      propertySection.appendChild(textLabel);
    }

    return propertySection;
  }

  private createInputTextSection(
    baseComponent: BaseComponent, propertyName: string, componentProperty: ComponentProperty) : HTMLElement {
    const propertySection = this.createPropertySection(propertyName);
    const input = document.createElement("input");
    input.setAttribute("type", "textbox");
    input.value = componentProperty.value;
    input.id = propertyName;
    input.oninput = (e: Event) => {
      componentProperty.value = input.value;
      baseComponent.PropertyChanged(propertyName, componentProperty);
    }

    propertySection.appendChild(input);
    return propertySection;
  }

  private createTextSection(propertyName: string, text: string) : HTMLElement {
    const propertySection = this.createPropertySection(propertyName);
    const textLabel = document.createElement("p");
    textLabel.innerHTML = text;
    textLabel.id = propertyName;

    propertySection.appendChild(textLabel);
    return propertySection;
  }

  private createColorPickerSection(
    baseComponent: BaseComponent, propertyName: string, componentProperty: ComponentProperty) : HTMLElement {
    const propertySection = this.createPropertySection(propertyName);
    const colorPickerButton = document.createElement("button");
    colorPickerButton.onclick = () => {
      this.onShowColorPicker(baseComponent, componentProperty, propertyName);
    };
    const icon = document.createElement("img");
    icon.src = `${AssetManager.AssetBasePath}/images/32x/icon_24.png`;
    icon.alt = "Color picker for " + propertyName;
    icon.width = 32;
    icon.height = 32;

    colorPickerButton.appendChild(icon);
    propertySection.appendChild(colorPickerButton);
    return propertySection;
  }

  private createNumberSliderSection(
    baseComponent: BaseComponent, propertyName: string, componentProperty: ComponentProperty) : HTMLElement {
    const propertySection = this.createPropertySection(propertyName);
    const sliderParent = document.createElement("div");
    sliderParent.className = EditorClasses.sliderParent;
    const sliderNumber = document.createElement("span");
    sliderNumber.className = EditorClasses.sliderNumber;
    sliderNumber.innerHTML = componentProperty.value;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = componentProperty.min.toString();
    slider.max = componentProperty.max.toString();
    slider.step = componentProperty.step.toString();
    slider.value = componentProperty.value;
    slider.className = EditorClasses.slider;
    slider.oninput = () => {
      try {
        sliderNumber.innerHTML = slider.value;
        componentProperty.value = Number(slider.value);
        baseComponent.PropertyChanged(propertyName, componentProperty);
      } catch (e) {
        console.warn(e);
      }
    }

    sliderParent.appendChild(slider);
    sliderParent.appendChild(sliderNumber);
    propertySection.appendChild(sliderParent);
    return propertySection;
  }

  private getNumberValueFromInput(inputValue: string) : number {
    const floatValue = parseFloat(inputValue);
    if (floatValue != undefined && floatValue != null && !isNaN(floatValue)) {
      return floatValue;
    }

    return -1;
  }

  private createVector3Section(baseComponent: BaseComponent, propertyName: string, componentProperty: ComponentProperty) : HTMLElement {
    const propertySection = this.createPropertySection(propertyName);

    const xInput = document.createElement("input");
    xInput.setAttribute("type", "text");
    xInput.value = componentProperty.value.x;
    xInput.oninput = (e: Event) => {
      const x = this.getNumberValueFromInput(xInput.value);
      if (x !== -1) {
        componentProperty.value.x = x;
        baseComponent.PropertyChanged(propertyName, componentProperty);
      }
    }
    propertySection.appendChild(xInput);

    const yInput = document.createElement("input");
    yInput.setAttribute("type", "text");
    yInput.value = componentProperty.value.y;
    yInput.oninput = (e: Event) => {
      const y = this.getNumberValueFromInput(yInput.value);
      if (y !== -1) {
        componentProperty.value.y = y;
        baseComponent.PropertyChanged(propertyName, componentProperty);
      }
    }
    propertySection.appendChild(yInput);

    const zInput = document.createElement("input");
    zInput.setAttribute("type", "text");
    zInput.value = componentProperty.value.z;
    zInput.oninput = (e: Event) => {
      const z = this.getNumberValueFromInput(zInput.value);
      if (z !== -1) {
        componentProperty.value.z = z;
        baseComponent.PropertyChanged(propertyName, componentProperty);
      }
    }
    propertySection.appendChild(zInput);

    return propertySection;
  }

  private createCheckboxSection(
    baseComponent: BaseComponent, propertyName: string, componentProperty: ComponentProperty,
    selectedCallback: (checked: boolean)=>any = ()=>{}) : HTMLElement {
    const propertySection = this.createPropertySection(propertyName);

    const input = document.createElement("input");
    input.setAttribute("type", "checkbox");
    input.id = propertyName;
    input.checked = componentProperty.value;
    input.addEventListener("click", () => {
      componentProperty.value = input.checked;
      baseComponent.PropertyChanged(propertyName, componentProperty);
      // this.showPropertiesWindow(baseComponent);
      selectedCallback(input.checked);
    });
    propertySection.appendChild(input);

    return propertySection;
  }

  private createEnumSection(
    enumType: any,
    baseComponent: BaseComponent,
    sectionName: string,
    propertyName: string,
    componentProperty: ComponentProperty) : HTMLElement {
    const enumValues = Object.values(enumType).filter((v) => isNaN(Number(v))) as string[];

    return this.createDropdownSection(baseComponent, enumValues, sectionName, propertyName, componentProperty);
  }

  private createDropdownSection(
    baseComponent: BaseComponent,
    dropdownValues: string[],
    sectionName: string,
    propertyName: string,
    componentProperty: ComponentProperty) {
    const propertySection = this.createPropertySection(sectionName);
    const select = document.createElement("select");

    for (let i = 0; i < dropdownValues.length; i++) {
      const option = document.createElement("option");
      option.value = dropdownValues[i] as string;
      option.innerHTML = dropdownValues[i] as string;
      select.appendChild(option);
    }
    select.value = componentProperty.value;
    select.onchange = (e: Event) => {
      componentProperty.value = select.value;
      baseComponent.PropertyChanged(propertyName, componentProperty);
      this.showPropertiesWindow(baseComponent);
    };

    propertySection.appendChild(select);
    return propertySection;
  }

  private createButtonSection(propertyName: string, componentProperty: ComponentProperty) : HTMLElement {
    const propertySection = this.createPropertySection("");
    propertySection.style.paddingTop = "10px";
    const button = document.createElement("button");
    button.onclick = componentProperty.value;
    button.innerHTML = propertyName;
    button.style.fontSize = "16px";

    propertySection.appendChild(button);
    return propertySection;
  }

  private createCreditSection(baseComponent: BaseComponent, componentProperty: ComponentProperty) : HTMLElement {
    const propertySection = this.createPropertySection("Credits", "h2");
    const creditProperty = componentProperty.value as CreditProperty;

    if (creditProperty.locked.value === true) {
      this.populateLockedCreditSection(baseComponent, creditProperty, propertySection);
    } else {
      this.populateUnlockedCreditSection(baseComponent, creditProperty, propertySection);
    }

    this.addLockedSection(baseComponent, creditProperty, propertySection);

    return propertySection;
  }

  private populateLockedCreditSection(
    baseComponent: BaseComponent, creditProperty: CreditProperty, propertySection: HTMLDivElement) {
    const nameSection = this.createTextSection(BaseComponent.CREDIT_PIECE_NAME, creditProperty.pieceName.value);
    propertySection.appendChild(nameSection);
    const authorSection = this.createTextSection(BaseComponent.CREDIT_AUTHOR_NAME, creditProperty.authorName.value);
    propertySection.appendChild(authorSection);
    const websiteSection = this.createTextSection(BaseComponent.CREDIT_WEBSITE_NAME, creditProperty.websiteName.value);
    propertySection.appendChild(websiteSection);
    const licenseNameSection = this.createTextSection(BaseComponent.CREDIT_LICENSE_NAME, creditProperty.licenseName.value);
    propertySection.appendChild(licenseNameSection);
  }

  private populateUnlockedCreditSection(
    baseComponent: BaseComponent, creditProperty: CreditProperty, propertySection: HTMLDivElement) {
    const nameInputSection = this.createInputTextSection(
      baseComponent, BaseComponent.CREDIT_PIECE_NAME, creditProperty.pieceName);
    propertySection.appendChild(nameInputSection);

    const authorInputSection = this.createInputTextSection(
      baseComponent, BaseComponent.CREDIT_AUTHOR_NAME, creditProperty.authorName);
    propertySection.appendChild(authorInputSection);

    const websiteInputSection = this.createInputTextSection(
      baseComponent, BaseComponent.CREDIT_WEBSITE_NAME, creditProperty.websiteName);
    propertySection.appendChild(websiteInputSection);

    const licenseNameInputSection = this.createInputTextSection(
      baseComponent, BaseComponent.CREDIT_LICENSE_NAME, creditProperty.licenseName);
    propertySection.appendChild(licenseNameInputSection);
  }

  private addLockedSection(
    baseComponent: BaseComponent, creditProperty: CreditProperty, propertySection: HTMLDivElement) {
    if (creditProperty.locked) {
      const lockedNameSection = this.createCheckboxSection(
        baseComponent,
        BaseComponent.CREDIT_LOCKED_NAME,
        creditProperty.locked,
        (locked: boolean) => {
          while (propertySection.childNodes.length > 1) {
            propertySection.removeChild(propertySection.lastElementChild);
          }

          if (locked) {
            this.populateLockedCreditSection(baseComponent, creditProperty, propertySection);
          } else {
            this.populateUnlockedCreditSection(baseComponent, creditProperty, propertySection);
          }
          propertySection.appendChild(lockedNameSection);
        }
      );
      propertySection.appendChild(lockedNameSection);
    }
  }

  private createUrlSection(baseComponent: BaseComponent, componentProperty: ComponentProperty): HTMLElement {
    const propertySection = this.createPropertySection("Source", "h2");
    const urlProperty = componentProperty.value as UrlProperty;

    const pathTypeSection = this.createEnumSection(
      UrlPathType, baseComponent, "Path Type", BaseComponent.URL_PATH_TYPE_NAME, urlProperty.pathType);
    propertySection.appendChild(pathTypeSection);

    const pathSection = this.createInputTextSection(
      baseComponent, BaseComponent.URL_PATH_NAME, urlProperty.path);
    propertySection.appendChild(pathSection);

    return propertySection;
  }

  private createTransformSection(baseComponent: BaseComponent, componentProperty: ComponentProperty) : HTMLElement {
    const propertySection = this.createPropertySection("Transform", "h2");
    const transformProperty = componentProperty.value as TransformProperty;

    const positionSection = this.createVector3Section(
      baseComponent, BaseComponent.TRANSFORM_POSITION_NAME, transformProperty.position);
    propertySection.appendChild(positionSection);

    const rotationSection = this.createVector3Section(
      baseComponent, BaseComponent.TRANSFORM_ROTATION_NAME, transformProperty.rotation);
    propertySection.appendChild(rotationSection);

    const scaleSection = this.createVector3Section(
      baseComponent, BaseComponent.TRANSFORM_SCALE_NAME, transformProperty.scale);
    propertySection.appendChild(scaleSection);

    return propertySection;
  }

  private createActionSection(baseComponent: BaseComponent, componentProperty: ComponentProperty) : HTMLElement {
    const propertySection = this.createPropertySection("Actions", "h2");
    const actionProperty = componentProperty.value as ActionProperty;
    const actionTypeSection = this.createEnumSection(
      ActionType, baseComponent, "Action Type", BaseComponent.ACTION_TYPE_NAME, actionProperty.actionType);

    propertySection.appendChild(actionTypeSection);

    switch (actionProperty.actionType.value) {
      case ActionType.HYPERLINK:
        const hyperlinkSection = this.createInputTextSection(
          baseComponent, BaseComponent.ACTION_HYPERLINK_URL_NAME, actionProperty.hyperlinkURL);
        propertySection.appendChild(hyperlinkSection);
        break;
      case ActionType.ZOOM_CAMERA_TO:
        const createButtonSection = this.createButtonSection(
          "Set Camera Position", actionProperty.zoomCameraMatrix);
        propertySection.appendChild(createButtonSection);
        break;
      case ActionType.TRIGGER_EVENT:
        const eventNameSection = this.createInputTextSection(
          baseComponent, BaseComponent.ACTION_EVENT_NAME_NAME, actionProperty.eventName);
        propertySection.appendChild(eventNameSection);
        break;
    }

    return propertySection;
  }
}