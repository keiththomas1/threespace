import * as THREE from "three";
import { generateUUID } from "three/src/math/MathUtils";
import { ActionType, ComponentAction, ComponentProperties, ComponentTransform, CreditInfo, SerializableVector3 } from "../../player/utils/playerDefinitions";
import PlayerUtils from "../../player/utils/playerUtils";
import { ComponentProperty, DEFAULT_MATRIX_ARRAY } from "../utils/constants";
import ThreeUtilities from "../utils/threeUtilities";

export interface ComponentEditorOptions {
  hasTransform?: boolean;
  hasActions?: boolean;
  hasCredit?: boolean;
}

export default class BaseComponent extends THREE.Object3D {
  static COMPONENT_NAME = "BaseComponent";

  public static readonly TRANSFORM_POSITION_NAME = "Position";
  public static readonly TRANSFORM_ROTATION_NAME = "Rotation";
  public static readonly TRANSFORM_SCALE_NAME = "Scale";

  public static readonly ACTION_TYPE_NAME = "Action Type";
  public static readonly ACTION_HYPERLINK_URL_NAME = "Hyperlink URL";
  public static readonly ACTION_ZOOM_CAMERA_MATRIX_NAME = "Zoom Camera Matrix";
  public static readonly ACTION_EVENT_NAME_NAME = "Event Name";

  public static readonly CREDIT_PIECE_NAME = "Name";
  public static readonly CREDIT_AUTHOR_NAME = "Author";
  public static readonly CREDIT_WEBSITE_NAME = "Website";
  public static readonly CREDIT_LICENSE_NAME = "License";
  public static readonly CREDIT_LOCKED_NAME = "Locked";

  protected readonly NAME_PROPERTY = "Name";
  public static readonly STRING_TYPE = "String";
  public static readonly COLOR_TYPE = "Color";
  public static readonly NUMBER_TYPE = "Number";
  public static readonly VECTOR3_TYPE = "Vector3";
  public static readonly BOOLEAN_TYPE = "Boolean";
  public static readonly LIST_TYPE = "List";
  public static readonly ENUM_TYPE = "Enum";
  public static readonly BUTTON_TYPE = "Button";
  public static readonly TRANSFORM_TYPE = "Transform";
  public static readonly ACTION_TYPE = "Action";
  public static readonly CREDIT_TYPE = "Credit";

  protected editorCamera: THREE.Camera;
  protected editorOptions: ComponentEditorOptions;

  protected mesh: THREE.Object3D | null = null;
  protected editorProperties: any = {};
  protected playerProperties: any = {};
  protected componentType: string = "";
  protected canDelete: boolean = true;
  private onTransformChanged: (baseComponent: BaseComponent)=>any = null;
  private cachedLocalMatrix: THREE.Matrix4 = null;
  private dontUpdatePropertyWindow: boolean = false;

  constructor(componentName: string = BaseComponent.COMPONENT_NAME,
    editorCamera: THREE.Camera,
    editorOptions: ComponentEditorOptions) {
    super();

    this.name = componentName + "_" + generateUUID();
    this.editorCamera = editorCamera;
    this.editorOptions = editorOptions;

    this.matrixAutoUpdate = true;
  }

  public static get BaseDefaultProperties() : ComponentProperties {
    return {
      componentType: "",
      transformMatrix: DEFAULT_MATRIX_ARRAY,
      action: {
        actionType: ActionType.NONE,
        hyperlinkURL: "",
        zoomCameraMatrix: null,
        eventName: ""
      },
      credit: {
        pieceName: "",
        authorName: "",
        websiteName: "",
        licenseName: "",
        locked: false
      },
      url: ""
    };
  }

  public get Mesh() : THREE.Object3D | null {
    return this.mesh;
  }

  public get CanDelete() {
    return this.canDelete;
  }

  public get EditorProperties(): any {
    return this.editorProperties;
  }

  public get PlayerProperties(): any {
    return this.playerProperties;
  }

  public get ComponentType(): string {
    return this.componentType;
  }

  public get EditorOptions(): ComponentEditorOptions {
    return this.editorOptions;
  }

  public set OnTransformChanged(newCallback: (baseComponent: BaseComponent)=>any) {
    this.onTransformChanged = newCallback;
  }

  public propertyChanged(propertyName: string, property: ComponentProperty) : void {
    this.editorProperties[propertyName] = property;

    switch (propertyName) {
      case BaseComponent.TRANSFORM_POSITION_NAME:
        this.position.copy(PlayerUtils.getVector3FromSerializableVector3(property.value));
        this.dontUpdatePropertyWindow = true;
        break;
      case BaseComponent.TRANSFORM_ROTATION_NAME:
        this.setRotationFromEuler(new THREE.Euler(property.value.x, property.value.y, property.value.z));
        this.dontUpdatePropertyWindow = true;
        break;
      case BaseComponent.TRANSFORM_SCALE_NAME:
        this.scale.copy(PlayerUtils.getVector3FromSerializableVector3(property.value));
        this.dontUpdatePropertyWindow = true;
        break;
      case BaseComponent.ACTION_TYPE_NAME:
        if (this.PlayerProperties.action) this.PlayerProperties.action.actionType = property.value;
        break;
      case BaseComponent.ACTION_HYPERLINK_URL_NAME:
        if (this.PlayerProperties.action) this.PlayerProperties.action.hyperlinkURL = property.value;
        break;
      case BaseComponent.ACTION_EVENT_NAME_NAME:
        if (this.PlayerProperties.action) this.PlayerProperties.action.eventName = property.value;
        break;
      case BaseComponent.CREDIT_PIECE_NAME:
        if (this.PlayerProperties.credit) this.PlayerProperties.credit.pieceName = property.value;
        break;
      case BaseComponent.CREDIT_AUTHOR_NAME:
        if (this.PlayerProperties.credit) this.PlayerProperties.credit.authorName = property.value;
        break;
      case BaseComponent.CREDIT_WEBSITE_NAME:
        if (this.PlayerProperties.credit) this.PlayerProperties.credit.websiteName = property.value;
        break;
      case BaseComponent.CREDIT_LICENSE_NAME:
        if (this.PlayerProperties.credit) this.PlayerProperties.credit.licenseName = property.value;
        break;
      case BaseComponent.CREDIT_LOCKED_NAME:
        if (this.PlayerProperties.credit) this.PlayerProperties.credit.locked = property.value;
        break;
    }
  }

  public selected() : void {
  }

  public unselected() : void {}

  public dispose() : void {
    if (this.mesh) {
      ThreeUtilities.disposeAllChildren(this.mesh, true);
      this.mesh.removeFromParent();
      this.mesh = null;
    }

    this.removeFromParent();
  }

  public raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection<THREE.Object3D<THREE.Event>>[]): void {
    super.raycast(raycaster, intersects);

    if (this.mesh) {
      this.raycastAllChildren([this.mesh], raycaster, intersects);
    }
  }

  protected setupEditorProperties(insertAfterName: ()=>any = ()=>{}) {
    this.editorProperties[this.NAME_PROPERTY] = { value: this.PlayerProperties.componentName, type: "String" };

    insertAfterName();

    if (this.editorOptions.hasTransform) {
      this.createTransformProperty();
    }
    if (this.editorOptions.hasActions) {
      this.createActionsProperty(this.PlayerProperties.action);
    }
    if (this.editorOptions.hasCredit) {
      this.createCreditProperty(this.PlayerProperties.credit);
    }
  }

  protected createTransformProperty = () => {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const matrix = this.matrix;
    matrix.decompose(position, quaternion, scale);
    const rotationEuler = new THREE.Euler().setFromQuaternion( quaternion, 'XYZ' );
    const transformProperty = {
      position: { value: position, type: "Vector3" },
      rotation: { value: rotationEuler, type: "Vector3" },
      scale: { value: scale, type: "Vector3" }
    };
    this.editorProperties[BaseComponent.TRANSFORM_TYPE] = { value: transformProperty, type: "Transform" };
  }

  protected createActionsProperty = (componentAction: ComponentAction) => {
    const actionProperty = {
      actionType: { value: componentAction.actionType, type: "ActionType", min: 0, max: 0 },
      hyperlinkURL: { value: componentAction.hyperlinkURL, type: "String", min: 0, max: 0 },
      zoomCameraMatrix: { value: this.handleZoomCameraMatrixSet, type: "Transform", min: 0, max: 0 },
      eventName: { value: componentAction.eventName, type: "String", min: 0, max: 0 },
    };
    this.editorProperties[BaseComponent.ACTION_TYPE] = { value: actionProperty, type: "Action" };
  }

  protected createCreditProperty = (credit: CreditInfo) => {
    const creditProperty = {
      pieceName: { value: credit.pieceName, type: "String" },
      authorName: { value: credit.authorName, type: "String" },
      websiteName: { value: credit.websiteName, type: "String" },
      licenseName: { value: credit.licenseName, type: "String" },
      locked: null
    };
    const env = process.env.NODE_ENV;
    if(env === "development"){
      creditProperty.locked = { value: credit.locked, type: "Boolean" };
    }
    this.editorProperties[BaseComponent.CREDIT_TYPE] = { value: creditProperty, type: "Credit" };
  }

  private handleZoomCameraMatrixSet = () => {
    const json = this.editorCamera.toJSON();
    this.PlayerProperties.action.zoomCameraMatrix = json.object.matrix;
  }

  protected assignProperties(properties: ComponentProperties) {
    const propertyEntries = Object.entries(properties);
    for (let i = 0; i < propertyEntries.length; i++) {
      if (propertyEntries[i][1] !== null) {
        this.PlayerProperties[propertyEntries[i][0]] = propertyEntries[i][1];
      }
    }
  }

  private raycastAllChildren(children: THREE.Object3D[], raycaster: THREE.Raycaster, intersects: THREE.Intersection<THREE.Object3D<THREE.Event>>[]) {
    children.forEach(child => {
      child.raycast(raycaster, intersects);
      this.raycastAllChildren(child.children, raycaster, intersects);
    });
  }

  public update(deltaTime: number) : void {
    if ((this.cachedLocalMatrix === null || !this.cachedLocalMatrix.equals(this.matrix)) && this.onTransformChanged !== null) {
      if (this.dontUpdatePropertyWindow) {
        this.dontUpdatePropertyWindow = false;
      } else {
        this.createTransformProperty();
        this.onTransformChanged(this);
      }

      this.cachedLocalMatrix = this.matrix.clone();
    }
  }
}