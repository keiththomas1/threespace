import * as THREE from "three";
import { ComponentProperty } from "../utils/constants";
import BaseComponent from "./baseComponent";

import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import ThreeUtilities from "../utils/threeUtilities";
import { CameraProperties, CameraType, ComponentType } from "../../player/utils/playerDefinitions";
import { AssetManager } from "../../shared/assetManager";
import { ComponentFactory } from "../../player/components/componentFactory";
import { SharedData } from "../../shared/sharedData";

export default class CameraComponent extends BaseComponent {
  private readonly DISPLAY_NAME = "Name";
  private readonly CAMERA_TYPE = "Type";
  private readonly CAMERA_FOV = "FOV";
  private readonly CAMERA_FOCUS = "Focus";
  private readonly CAMERA_VIEWPORT = "Always Show Viewport";
  private readonly CAMERA_ALIGN_WITH_VIEW = "Align with View";

  protected cameraProperties: CameraProperties = CameraComponent.DefaultProperties;

  private camera: THREE.Camera | null = null;
  private renderTarget: THREE.WebGLRenderTarget | null = null;
  private renderMesh: THREE.Mesh | null = null;
  private alwaysShowViewport: boolean = false;

  private moveCameraToEditorCamera: () => any;

  constructor(
    scene: THREE.Scene,
    cameraProperties: CameraProperties,
    editorCamera: THREE.Camera,
    moveCameraToEditorCamera: () => any) {
    super("CameraComponent", editorCamera, { hasActions: false, hasCredit: false, hasTransform: true});

    this.componentType = ComponentType.Light;
    this.canDelete = false;
    this.assignProperties(cameraProperties);
    this.setupEditorProperties();

    this.componentType = ComponentType.Camera;
    this.moveCameraToEditorCamera = moveCameraToEditorCamera;

    this.createCamera(cameraProperties.type);
    this.createCameraModelRepresentation();
    this.createRenderTexture(scene);
  }

  public static get DefaultProperties() : CameraProperties {
    const defaultproperties = this.BaseDefaultProperties as CameraProperties;
    defaultproperties.componentType = ComponentType.Camera;
    defaultproperties.target = { x: 0, y: 0, z: 0};
    defaultproperties.type = CameraType.PERSPECTIVE;
    defaultproperties.fov = 75;
    return defaultproperties;
  }

  /* Overridden player properties */
  public get ComponentProperties(): CameraProperties {
    return this.cameraProperties;
  }

  public get Camera() {
    return this.camera;
  }

  public get RenderTarget() {
    return this.renderTarget;
  }

  public PropertyChanged(propertyName: string, property: ComponentProperty) {
    super.PropertyChanged(propertyName, property);

    switch (propertyName) {
      case this.CAMERA_FOV:
        if (this.camera && this.camera instanceof THREE.PerspectiveCamera) this.camera.fov = property.value;
        this.cameraProperties.fov = property.value;
        break;
      case this.CAMERA_FOCUS:
        this.cameraProperties.target = property.value;
        break;
      case this.CAMERA_TYPE:
        if (this.camera) {
          this.remove(this.camera);
        }
        if (this.mesh) {
          this.remove(this.mesh);
          ThreeUtilities.disposeAllChildren(this.mesh, false);
        }

        this.cameraProperties.type = property.value;
        this.createCamera(property.value as CameraType);
        this.createCameraModelRepresentation();
        break;
      case this.CAMERA_VIEWPORT:
        this.alwaysShowViewport = property.value;
        if (this.renderMesh) this.renderMesh.visible = property.value;
        break;
    }
  }

  public selected(): void {
    super.selected();

    if (this.renderMesh) this.renderMesh.visible = true;
  }

  public unselected(): void {
    super.unselected();

    if (this.renderMesh && !this.alwaysShowViewport) this.renderMesh.visible = false;
  }

  public update(deltaTime: number) {
    super.update(deltaTime);

    if (this.renderMesh) {
      this.renderMesh.position.set(this.position.x, this.position.y - 3, this.position.z);
      this.renderMesh.lookAt(this.editorCamera.position);
    }
  }

  private createCamera(cameraType: CameraType) {
    this.editorProperties = {};
    this.editorProperties[this.DISPLAY_NAME] = { value: "Camera", type: "String" };
    this.editorProperties[this.CAMERA_TYPE] = { value: cameraType, type: "Enum", enumType: CameraType };
    this.editorProperties[this.CAMERA_FOCUS] = { value: this.cameraProperties.target, type: "Vector3" };
    this.editorProperties[this.CAMERA_VIEWPORT] = { value: false, type: "Boolean" };
    this.editorProperties[this.CAMERA_ALIGN_WITH_VIEW] = {
      value: this.moveCameraToEditorCamera,
      type: "Button",
      tooltip: "Moves this camera to same rotation and position as the current editor view." };
    switch (cameraType) {
      case CameraType.PERSPECTIVE:
        this.editorProperties[this.CAMERA_FOV] = { value: this.cameraProperties.fov, type: "Number", min: 5, max: 180, step: 1 };
        break;
      case CameraType.ORTHOGRAPHIC:
        break;
    }

    if (this.editorOptions.hasTransform) {
      this.createTransformProperty();
    }

    this.camera = ComponentFactory.CreatePlayerCamera(this.cameraProperties);

    this.add(this.camera);
  }

  private createCameraModelRepresentation() {
    const gltfLoader = new GLTFLoader();
    const self = this;
    gltfLoader.load(`${AssetManager.AssetBasePath}/models/camera/camera.glb`, (gltf: GLTF) => {
      ThreeUtilities.setBasicMaterialOnGLTF(gltf.scene);
      self.mesh = gltf.scene;
      self.mesh.traverse(child => child.layers.set(SharedData.EDITOR_LAYER));
      this.add( self.mesh );
      self.mesh.position.set(0, 0, 0);
      self.mesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI);
      self.mesh.scale.set(0.02, 0.02, 0.02);
    });
  }

  private createRenderTexture(scene: THREE.Scene) {
    this.renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});

    const material = new THREE.MeshBasicMaterial({map: this.renderTarget.texture})
    const plane = new THREE.PlaneGeometry( 4, 4 );
    this.renderMesh = new THREE.Mesh(plane, material);
    this.renderMesh.layers.set(SharedData.EDITOR_LAYER);
    this.renderMesh.visible = false;
    scene.add(this.renderMesh);

    // "Border" Mesh
    const borderMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF})
    const borderPlane = new THREE.PlaneGeometry( 4.4, 4.4 );
    const borderMesh = new THREE.Mesh(borderPlane, borderMaterial);
    borderMesh.layers.set(SharedData.EDITOR_LAYER);
    this.renderMesh.add(borderMesh);
    borderMesh.position.set(0, 0, -0.3);
  }
}