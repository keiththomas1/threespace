import * as THREE from "three";
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from "./external/OrbitControls.js";
import { OrbitControlsGizmo } from  "./external/OrbitControlsGizmo.js";
import anime from 'animejs';
import { DEFAULT_BACKGROUND_COLOR } from "./utils/constants";
import { buildEditorDom } from "./editorDom";
import { EditorClasses, EditorIds } from "./editorIds";
import GridRenderer from "./gridRenderer";
import UiController from "./uiController";
import Particles from "./particles";
import BaseComponent from "./components/baseComponent";
import ComponentManager from "./componentManager";
import { ThreeSpacePlayer } from "../player/threeSpacePlayer";
import { AudioProperties, BackgroundColorType, CameraProperties, ComponentProperties,
  ComponentType, ImageProperties, LightProperties, LightType,
  ModelProperties, PlayerProperties, SceneProperties, Text3DProperties, VFXProperties, VideoProperties
  } from "../player/utils/playerDefinitions";
import PlayerUtils from "../player/utils/playerUtils";
import PostProcessingManager from "../player/postProcessingManager";
import ImageComponent from "./components/imageComponent";
import LightComponent from "./components/lightComponent";
import CameraComponent from "./components/cameraComponent";
import ModelComponent from "./components/modelComponent";
import Text3DComponent from "./components/text3DComponent";
import SkyBox from "../player/skyBox";
import SettingsComponent from "./components/settingsComponent";
import VideoComponent from "./components/videoComponent";
import AudioComponent from "./components/audioComponent";
import { VFXType } from "../player/utils/playerDefinitions";
import VFXSnow from "../editor/vfx/VFXSnow";
import VFXDust from "../editor/vfx/VFXDust";
import VFXRain from "../editor/vfx/VFXRain";
import VFXFish from "../editor/vfx/VFXFish";
import VFXComponent from "./vfx/VFXComponent";
import { BasicVfxData } from "../player/utils/vfxInfo";

export interface EditorConfig {
  playerProperties?:         PlayerProperties;
  onSave?:        (scene: PlayerProperties) => void;
  onLoad?:        () => Promise<PlayerProperties | null>;
  /** Prepended to the filename when building the exported URL.
   *  e.g. "/models/" → file "robot.glb" is exported as "/models/robot.glb". */
  assetBasePath?: string;
}

/**
 * The ThreeSpace editor. Spins up a new scene and provides tools for creating and editing 3D content.
 */
export class ThreeSpaceEditor {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private gridRenderer: GridRenderer;
  private uiController: UiController;
  private componentManager: ComponentManager;
  private postProcessingManager: PostProcessingManager;

  private clock: THREE.Clock;
  private editorParent: HTMLElement;
  private raycaster: THREE.Raycaster;
  private raycastResults: THREE.Intersection<THREE.Object3D<THREE.Event>>[] = [];
  private outlineObjects: THREE.Object3D[] = [];
  private clickTimer: number = 0;
  private mousePosition: THREE.Vector2 = new THREE.Vector2();
  private config: EditorConfig;

  private roomGroup: THREE.Group;
  private editorCamera: THREE.PerspectiveCamera;
  private userCamera: CameraComponent | null = null;
  private inPreviewMode: boolean = false;
  private previewPlayer: ThreeSpacePlayer | null = null;
  private cubeCamera: THREE.CubeCamera;
  private stats: any;
  private skybox: SkyBox;
  private settingsComponent: SettingsComponent;
  private vfx: VFXDust[] = [];

  /**
   * @param container // The HTMLElement that this will create it's scene within.
   * @param config // The config to start the editor up with.
   */
  public constructor(container: HTMLElement, config: EditorConfig = {}) {
    this.editorParent = container;
    this.config = config;

    // Build editor DOM inside the container, get back the canvas mount point.
    const dom = buildEditorDom(container, {
      onUploadImage:      this.uploadImage,
      onImportImageByUrl: this.addImageByURL,
      onUploadVideo:      this.uploadVideo,
      onImportVideoByUrl: (url) => { const p = VideoComponent.DefaultProperties; p.url = url; this.importVideo(p); },
      onUploadModel:      this.uploadModels,
      onImportModelByUrl: this.importModelByURL,
      onAddLight:         this.addLightComponent,
      onUploadAudio:      this.uploadAudio,
      onShowVFX:          () => { const m = document.getElementById(EditorIds.vfxSelection); if (m) m.style.visibility = 'visible'; },
      onSceneSettings:    this.showSceneSettingsProperties,
    });

    this.scene = new THREE.Scene();
    this.scene.background = DEFAULT_BACKGROUND_COLOR;
    this.editorCamera = new THREE.PerspectiveCamera( 75, 1, 0.1, 1000 );
    this.editorCamera.position.set(10, 10, 10);
    this.editorCamera.layers.enableAll();

    this.renderer = new THREE.WebGLRenderer();
    const canvas = this.renderer.domElement;
    dom.canvasParent.appendChild(canvas);
    canvas.onmousemove = this.canvasMouseMove;
    canvas.onmousedown = this.canvasMouseDown;
    canvas.onmouseup = this.canvasMouseUp;
    canvas.style.pointerEvents = "all";

    this.controls = new OrbitControls( this.editorCamera, canvas );
    this.controls.maxDistance = 500;
    const controlsGizmo = new OrbitControlsGizmo(
      this.controls, { size: 100, padding: 8 });
    controlsGizmo.domElement.classList.add(EditorClasses.orbitControlsGizmo);
    controlsGizmo.domElement.classList.add(EditorClasses.firstUIDepth);
    dom.canvasParent.appendChild(controlsGizmo.domElement);

    this.roomGroup = new THREE.Group();
    this.scene.add(this.roomGroup);

    this.componentManager = new ComponentManager(
      this.scene, this.editorCamera, canvas, this.controls, this.focusCamera);

    this.postProcessingManager = new PostProcessingManager(
      this.renderer, this.scene, this.editorCamera);
    const edgeStrength = 2;
    this.postProcessingManager.setupOutline(edgeStrength);

    this.clock = new THREE.Clock(true);

    this.gridRenderer = new GridRenderer();
    this.gridRenderer.setupGrid(this.roomGroup);

    const renderTarget = new THREE.WebGLCubeRenderTarget(256);
    this.cubeCamera = new THREE.CubeCamera(0, 1000, renderTarget);
    this.scene.add(this.cubeCamera);

    this.uiController = new UiController(
      this.roomGroup,
      this.editorCamera,
      this.componentManager,
      this.componentAdded,
      this.togglePreview,
      this.resetScene,
      this.saveScene);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.layers.enableAll();

    const particles = new Particles();

    this.skybox = new SkyBox(this.scene);

    this.settingsComponent = new SettingsComponent(
      SettingsComponent.DefaultProperties,
      () => {
        this.setSceneSettings(this.settingsComponent.PlayerProperties);
      },
      () => {
        this.uiController.setResetScenePopupVisibility("visible");
      }
    );

    this.stats = new Stats();
    container.appendChild(this.stats.dom);

    canvas.addEventListener("mousedown", (event) => {
      if (event.button === 1) event.preventDefault();
    });
    canvas.addEventListener('touchstart', this.touchStart);

    if (!PlayerUtils.isMobile(navigator)) {
      window.addEventListener("resize", this.resize);
    }
    window.addEventListener('orientationchange', this.orientationChange);

    // Wire VFX selection buttons
    const vfxBindings: Array<[string, VFXType]> = [
      [EditorIds.vfxBasicButton, VFXType.Basic],
      [EditorIds.vfxDustButton,  VFXType.Dust],
      [EditorIds.vfxSnowButton,  VFXType.Snow],
      [EditorIds.vfxRainButton,  VFXType.Rain],
      [EditorIds.vfxFishButton,  VFXType.Fish],
    ];
    vfxBindings.forEach(([id, type]) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.addVFX(type));
    });

    this.setupDefaultScene();
    this.resize();
    this.update();

    // ResizeObserver keeps the canvas in sync whenever the container is
    // laid out or resized — this also fires once immediately after the
    // browser paints, fixing the default 300×150 canvas size.
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(container);
    }

    // Load initial scene — direct value takes priority over async callback.
    if (config.playerProperties) {
      this.setPlayerProperties(config.playerProperties);
    } else if (config.onLoad) {
      config.onLoad().then(scene => {
        if (scene) this.setPlayerProperties(scene);
      });
    }
  }

  /** The underlying WebGL canvas element. Style or reposition it as needed. */
  public get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public setPlayerProperties = (playerProperties: PlayerProperties) => {
    if (playerProperties !== null) {
      this.clearScene();
      this.addComponents(playerProperties.components);
      this.setSceneSettings(playerProperties.sceneProperties);
      this.settingsComponent.PlayerProperties = playerProperties.sceneProperties;
    }
  }

  public addComponents = (components: ComponentProperties[]) => {
    for (let i = 0; i < components.length; i++) {
      this.addComponent(components[i]);
    }
  }

  public addImageByURL = (url: string) => {
    const imageProperties = ImageComponent.DefaultProperties;
    imageProperties.url = url;
    const imageComponent = new ImageComponent(imageProperties, null, this.editorCamera)
    this.roomGroup.add(imageComponent);
    this.componentAdded(imageComponent);
  }

  public importVideo = (properties: VideoProperties) => {
    const videoComponent = new VideoComponent(properties, this.editorCamera)
    this.roomGroup.add(videoComponent);
    this.componentAdded(videoComponent);
  }

  public importModelByURL = (url: string) => {
    const modelProperties = ModelComponent.DefaultProperties;
    modelProperties.url = url;
    const modelComponent = new ModelComponent(modelProperties, this.editorCamera, ()=>{});
    this.roomGroup.add(modelComponent);
    this.componentAdded(modelComponent);
  }

  private showPathConfirmPopup(filename: string, defaultPath: string): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = document.getElementById(EditorIds.pathConfirmPopupParent);
      const input = document.getElementById(EditorIds.pathConfirmInput) as HTMLInputElement;
      if (!overlay || !input) { resolve(defaultPath); return; }

      const label = document.getElementById(EditorIds.pathConfirmPopupLabel);
      if (label) {
        label.textContent = `Note: Edit the path below if the file lives in a subfolder.`;
      }

      input.value = defaultPath;
      overlay.style.visibility = 'visible';
      input.focus();
      input.select();

      const form = input.closest('form');
      const cancelBtn = document.getElementById(EditorIds.pathConfirmCancelButton);
      const cleanup = () => { overlay.style.visibility = 'hidden'; };

      const onSubmit = (e: Event) => {
        e.preventDefault();
        cleanup();
        resolve(input.value || null);
      };
      const onCancel = () => {
        cleanup();
        resolve(null);
      };

      form?.addEventListener('submit', onSubmit, { once: true });
      cancelBtn?.addEventListener('click', onCancel, { once: true });
    });
  }

  uploadAndPlaceAsset = async (files: File[], createComponent: (dataURL: string, exportUrl: string) => BaseComponent) => {
    let placed = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const defaultPath = (this.config.assetBasePath ?? '') + file.name;
      const exportUrl = await this.showPathConfirmPopup(file.name, defaultPath);
      if (!exportUrl) continue;

      const position = new THREE.Vector3(placed * 3, 5, 0);
      placed++;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          const component = createComponent(event.target.result, exportUrl);
          this.roomGroup.add(component);
          component.position.copy(position);
          this.componentAdded(component);
          this.focusCamera(component);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  public uploadImage = (files: File[]) => {
    this.uploadAndPlaceAsset(files, (dataURL, exportUrl) => {
      const p = ImageComponent.DefaultProperties;
      p.url = exportUrl;
      return new ImageComponent(p, null, this.editorCamera, dataURL);
    });
  }

  public uploadVideo = (files: File[]) => {
    this.uploadAndPlaceAsset(files, (dataURL, exportUrl) => {
      const p = VideoComponent.DefaultProperties;
      p.url = exportUrl;
      return new VideoComponent(p, this.editorCamera, dataURL);
    });
  }

  public uploadModels = (files: File[]) => {
    this.uploadAndPlaceAsset(files, (dataURL, exportUrl) => {
      const p = ModelComponent.DefaultProperties;
      p.url = exportUrl;
      return new ModelComponent(p, this.editorCamera, ()=>{}, dataURL);
    });
  }

  public uploadAudio = (files: File[]) => {
    this.uploadAndPlaceAsset(files, (dataURL, exportUrl) => {
      const p = AudioComponent.DefaultProperties;
      p.url = exportUrl;
      return new AudioComponent(p, this.editorCamera, dataURL);
    });
  }

  public addLightComponent = () => {
    const lightProperties = LightComponent.DefaultProperties;
    const lightComponent = new LightComponent(lightProperties);
    this.roomGroup.add(lightComponent);
    this.componentAdded(lightComponent);
  }

  public addVFX = (type: VFXType) => {
    let vfx, vfxProperties = null;
    switch (type) {
      case VFXType.Basic:
        vfxProperties = VFXDust.DefaultProperties;
        vfx = new VFXComponent(vfxProperties, BasicVfxData);
        break;
      case VFXType.Dust:
        vfxProperties = VFXDust.DefaultProperties;
        vfx = new VFXDust(vfxProperties);
        break;
      case VFXType.Snow:
        vfxProperties = VFXSnow.DefaultProperties;
        vfx = new VFXSnow(vfxProperties);
        break;
      case VFXType.Rain:
        vfxProperties = VFXRain.DefaultProperties;
        vfx = new VFXRain(vfxProperties);
        break;
      case VFXType.Fish:
        vfxProperties = VFXFish.DefaultProperties;
        vfx = new VFXFish(vfxProperties, this.renderer);
        break;
    }

    if (vfx) {
      this.roomGroup.add(vfx);
      this.componentAdded(vfx);
      this.vfx.push(vfx);
    }
  }

  public showSceneSettingsProperties = () => {
    this.uiController.showPropertiesWindow(this.settingsComponent);
  }

  public resize = () => {
    if (this.editorCamera) {
      this.editorCamera.aspect = this.editorParent.clientWidth / this.editorParent.clientHeight;
      this.editorCamera.updateProjectionMatrix();
    }
    if (this.userCamera && this.userCamera.Camera && this.userCamera.Camera instanceof THREE.PerspectiveCamera) {
      this.userCamera.Camera.aspect =
        this.editorParent.clientWidth / this.editorParent.clientHeight;
      this.userCamera.Camera.updateProjectionMatrix();
    }

    this.postProcessingManager.resize(this.editorParent.clientWidth, this.editorParent.clientHeight);

    this.renderer.setSize(this.editorParent.clientWidth, this.editorParent.clientHeight, true);
  }

  private update = () => {
    requestAnimationFrame( this.update );

    if (this.inPreviewMode) {
      return;
    }

    this.cubeCamera.update(this.renderer, this.scene);

    if (this.inPreviewMode) {
      if (this.userCamera && this.userCamera.Camera !== null) {
        this.renderer.render( this.scene, this.userCamera.Camera );
      }
    } else {
      if (this.userCamera && this.userCamera.Camera !== null) {
        this.renderer.setRenderTarget(this.userCamera.RenderTarget);
        this.renderer.render( this.scene, this.userCamera.Camera );
        this.renderer.setRenderTarget(null);
      }

      this.renderer.render( this.scene, this.editorCamera );
    }

    const deltaTime = this.clock.getDelta();

    for (let i = 0; i < this.vfx.length; i++) {
      this.vfx[i].update(deltaTime);
    }

    this.controls.update();
    this.stats.update();
    this.componentManager.update(deltaTime);
    this.uiController.update();
    this.postProcessingManager.update();
    if (this.userCamera) this.userCamera.update(deltaTime);
  }

  private getSceneProperties = () : PlayerProperties => {
    const sceneProperties = ThreeSpacePlayer.getDefaultSpaceProperties();

    const components = this.componentManager.Components;
    for (let i = 0; i < components.length; i++) {
      const json = components[i].toJSON();
      const properties = components[i].PlayerProperties;
      properties.transformMatrix = json.object.matrix;

      sceneProperties.components.push(properties);
    }

    sceneProperties.sceneProperties = this.settingsComponent.PlayerProperties;

    return sceneProperties;
  }

  private saveScene = () => {
    const sceneProperties = this.getSceneProperties();

    const json = JSON.stringify(sceneProperties, null, 2);

    const textarea = document.getElementById(EditorIds.savePopupTextarea) as HTMLTextAreaElement;
    if (textarea) textarea.value = json;

    const downloadBtn = document.getElementById(EditorIds.savePopupDownloadButton);
    if (downloadBtn) {
      downloadBtn.onclick = () => {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scene.json';
        a.click();
        URL.revokeObjectURL(url);
      };
    }

    const popup = document.getElementById(EditorIds.savePopupParent);
    if (popup) popup.style.visibility = 'visible';

    if (this.config.onSave) this.config.onSave(sceneProperties);
  }

  private addComponent = (componentProperties: ComponentProperties) => {
    const matrix = new THREE.Matrix4().fromArray(componentProperties.transformMatrix);
    const dataURL = componentProperties.url;

    let component: any = null;
    switch (componentProperties.componentType) {
      case ComponentType.Camera:
        component = new CameraComponent(
          this.scene, componentProperties as CameraProperties,
          this.editorCamera, this.alignUserCameraWithView);
        this.userCamera = component;
        break;
      case ComponentType.Light:
        component = new LightComponent(componentProperties as LightProperties);
        break;
      case ComponentType.Text3D:
        component = new Text3DComponent(componentProperties as Text3DProperties, this.editorCamera);
        break;
      case ComponentType.Video:
        component = new VideoComponent(componentProperties as VideoProperties, this.editorCamera, dataURL);
        break;
      case ComponentType.Image:
        component = new ImageComponent(componentProperties as ImageProperties, null, this.editorCamera, dataURL)
        break;
      case ComponentType.Model:
        component = new ModelComponent(componentProperties as ModelProperties, this.editorCamera, ()=>{}, dataURL);
        break;
      case ComponentType.Audio:
        component = new AudioComponent(componentProperties as AudioProperties, this.editorCamera, dataURL);
        break;
      case ComponentType.VFX:
        const vfxProperties = componentProperties as VFXProperties;
        switch (vfxProperties.type) {
          case VFXType.Basic:
            component = new VFXComponent(vfxProperties, BasicVfxData);
            break;
          case VFXType.Snow:
            component = new VFXSnow(vfxProperties);
            break;
          case VFXType.Dust:
            component = new VFXDust(vfxProperties);
            break;
          case VFXType.Rain:
            component = new VFXRain(vfxProperties);
            break;
          case VFXType.Fish:
            component = new VFXFish(vfxProperties, this.renderer);
            break;
        }
        break;
      case ComponentType.Webpage:
        break;
    }

    if (component) {
      this.roomGroup.add(component);
      component.applyMatrix4(matrix);

      this.componentAdded(component, false);
    }
  }

  private setBackgroundColorSolid = (color: THREE.Color) => {
    this.scene.background = color;
    this.skybox.Enabled = false;
  }

  private setBackgroundColorGradient = (colorOne: THREE.Color, colorTwo: THREE.Color) => {
    this.skybox.Enabled = true;
    this.skybox.ColorOne = colorOne;
    this.skybox.ColorTwo = colorTwo;
  }

  private orientationChange = (e: Event) => {
    // Temporarily add a resize event listener
    window.addEventListener('resize', this.changeOrientation);
  }

  private changeOrientation = () => {
    this.resize();
    window.removeEventListener('resize', this.changeOrientation);
  }

  private focusCamera = (object: THREE.Object3D) => {
    this.controls.enabled = false;
    this.editorCamera.updateMatrix();

    const cameraDistance = 7; // TODO: Base this on object size so you can view whole object.
    const direction = this.editorCamera.position.sub(object.position);
    let newPosition = direction.clone().normalize();
    const objectPosition = object.position.clone();
    newPosition = objectPosition.add(newPosition.multiplyScalar(cameraDistance));
    const lookMatrix = new THREE.Matrix4().lookAt(newPosition, object.position, new THREE.Vector3(0,1,0));
    const lookQuaternion = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);

    anime({
      targets: this.editorCamera.position,
      easing: 'easeInCubic',
      duration: 1000,
      x: newPosition.x,
      y: newPosition.y,
      z: newPosition.z,
      complete: () => {
        this.controls.enabled = true;
      }
    });
    anime({
      targets: this.editorCamera.quaternion,
      easing: 'easeInCubic',
      duration: 1000,
      x: lookQuaternion.x,
      y: lookQuaternion.y,
      z: lookQuaternion.z,
      w: lookQuaternion.w
    });
  }

  private componentAdded = (component: BaseComponent, selectComponent: boolean = true) => {
    this.componentManager.addComponent(component);
    if (selectComponent) {
      this.componentManager.setSelectedComponent(component);
      this.uiController.showPropertiesWindow(component);
    }
  }

  private togglePreview = (inPreviewMode: boolean) => {
    this.inPreviewMode = inPreviewMode;
    const playerParent = document.getElementById(EditorIds.playerPreviewParent);

    if (inPreviewMode) {
      if (playerParent) {
        playerParent.style.pointerEvents = 'all';
        this.previewPlayer = new ThreeSpacePlayer(playerParent, this.getSceneProperties());
      }
    } else {
      if (this.previewPlayer) {
        this.previewPlayer.dispose();
        this.previewPlayer = null;
      }
      if (playerParent) playerParent.style.pointerEvents = 'none';
    }
  }

  private resetScene = () => {
    this.clearScene();
    this.setupDefaultScene();
  }

  private clearScene = () => {
    this.componentManager.disposeAll();
  }

  private setSceneSettings = (sceneProperties: SceneProperties) => {
    const colorOne = PlayerUtils.getColorFromSerializableColor(sceneProperties.colorOne);
    switch (sceneProperties.backgroundColorType) {
      case BackgroundColorType.Single:
        this.setBackgroundColorSolid(colorOne);
        break;
      case BackgroundColorType.Gradient:
        this.setBackgroundColorGradient(
          colorOne, PlayerUtils.getColorFromSerializableColor(sceneProperties.colorTwo));
        break;
    }
  }

  private setupDefaultScene = () => {
    this.setSceneSettings(SettingsComponent.DefaultProperties);
    this.settingsComponent.PlayerProperties = SettingsComponent.DefaultProperties;

    this.userCamera = new CameraComponent(
      this.scene,
      CameraComponent.DefaultProperties as CameraProperties,
      this.editorCamera,
      this.alignUserCameraWithView);
    this.roomGroup.add(this.userCamera);
    this.userCamera.position.set(0, 5, 5);
    this.userCamera.lookAt(new THREE.Vector3(0, 10, 10));
    this.componentAdded(this.userCamera, false);

    const ambientLightProperties = LightComponent.DefaultProperties;
    ambientLightProperties.type = LightType.AMBIENT;
    const ambientLight = new LightComponent(ambientLightProperties as LightProperties);
    this.roomGroup.add(ambientLight);
    ambientLight.position.set(0, 7.5, 0);
    this.componentAdded(ambientLight, false);

    const directionalLightProperties = LightComponent.DefaultProperties;
    directionalLightProperties.type = LightType.DIRECTIONAL;
    const directionalLight = new LightComponent(directionalLightProperties as LightProperties);
    this.roomGroup.add(directionalLight);
    directionalLight.position.set(5, 10, -5);
    directionalLight.lookAt(new THREE.Vector3(0, 0, 0));
    this.componentAdded(directionalLight, false);
  }

  private alignUserCameraWithView = () => {
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    this.editorCamera.updateMatrix();
    this.editorCamera.matrix.decompose(position, rotation, scale);

    if (this.userCamera) {
      this.userCamera.position.copy(position);
      this.userCamera.quaternion.copy(rotation);
    }
  }

  private canvasMouseMove = (e: MouseEvent) => {
    this.mousePosition.x = ( e.clientX / window.innerWidth ) * 2 - 1;
    this.mousePosition.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
    this.raycaster.setFromCamera( this.mousePosition, this.editorCamera );
    this.raycastResults.length = 0;
    this.raycaster.intersectObjects( this.componentManager.Components, false, this.raycastResults);

    this.outlineObjects = [];
    if (this.raycastResults.length > 0) {
      const baseComponents: BaseComponent[] = [];
      this.getBaseComponentParent(this.raycastResults[0].object, baseComponents);

      if (baseComponents.length > 0) {
        if (baseComponents[0].Mesh) this.outlineObjects = [baseComponents[0].Mesh];
      }
    }

    this.postProcessingManager.setOutlineObjects(this.outlineObjects);
  }

  private canvasMouseDown = (e: MouseEvent) => {
    this.clickTimer = this.clock.getElapsedTime();
  }

  private canvasMouseUp = (e: MouseEvent) => {
    if (this.clock.getElapsedTime() - this.clickTimer >= 0.3) {
      return;
    }

    if (this.raycastResults.length > 0) {
      const baseComponents: BaseComponent[] = [];
      this.getBaseComponentParent(this.raycastResults[0].object, baseComponents);

      if (baseComponents.length > 0) {
        this.componentManager.setSelectedComponent(baseComponents[0]);
        this.uiController.show3DToolsWindow();
        this.uiController.showPropertiesWindow(baseComponents[0]);
      } else {
        this.componentManager.setSelectedComponent(null);
        this.uiController.hide3DToolsWindow();
        this.uiController.hidePropertiesWindow();
      }
    } else {
      this.componentManager.setSelectedComponent(null);
      this.uiController.hide3DToolsWindow();
      this.uiController.hidePropertiesWindow();
    }

    this.uiController.resetUIState();
  }

  private getBaseComponentParent(object: THREE.Object3D, baseComponents: BaseComponent[]) {
    if (object instanceof BaseComponent) {
      baseComponents.push(object);
      return;
    }
    if (object.parent) {
      this.getBaseComponentParent(object.parent, baseComponents);
    }
  }

  touchStart = (event: TouchEvent) => {
    this.mousePosition.x = (event.changedTouches[0].clientX / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(event.changedTouches[0].clientY / window.innerHeight) * 2 + 1;
  }
}