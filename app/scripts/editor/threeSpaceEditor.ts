import * as THREE from "three";
import { OrbitControls } from "./external/OrbitControls";
import { OrbitControlsGizmo } from  "./external/OrbitControlsGizmo";
import anime from 'animejs';
import { DEFAULT_BACKGROUND_COLOR } from "./utils/constants";
import { buildEditorDom } from "./editorDom";
import { EditorClasses, EditorIds } from "./editorIds";
import GridRenderer from "./gridRenderer";
import UiController from "./uiController";
import BaseComponent from "./components/baseComponent";
import ComponentManager from "./componentManager";
import { ThreeSpacePlayer } from "../player/threeSpacePlayer";
import { AudioProperties, BackgroundColorType, CameraProperties, ComponentProperties,
  ComponentType, ImageProperties, LightProperties, LightType,
  ModelProperties, PlayerProperties, SceneProperties, Text3DProperties, VFXProperties, VideoProperties
  } from "../player/utils/playerDefinitions";
import { AssetManager } from "../shared/assetManager";
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
import VFXSnow from "./vfx/vfxSnow";
import VFXDust from "./vfx/vfxDust";
import VFXRain from "./vfx/vfxRain";
import VFXFish from "./vfx/vfxFish";
import VFXComponent from "./vfx/vfxComponent";
import { BasicVfxData } from "../player/utils/vfxInfo";
import { SharedData } from "../shared/sharedData";
import { ProjectView } from "./ui/projectView";
import { SharedUtils } from "../shared/sharedUtils";

export interface EditorConfig {
  playerProperties?:         PlayerProperties;
  onSave?:        (scene: PlayerProperties) => void;
  onLoad?:        () => Promise<PlayerProperties | null>;
}

/**
 * The ThreeSpace editor. Spins up a new scene and provides tools for creating and editing 3D content.
 */
export class ThreeSpaceEditor {
  /* Managers and core objects */
  private scene: THREE.Scene;
  private editorParent: HTMLElement;
  private controls: OrbitControls;
  private gridRenderer: GridRenderer;
  private uiController: UiController;
  private componentManager: ComponentManager;
  private postProcessingManager: PostProcessingManager;

  /* 3D Scene objects */
  private renderer: THREE.WebGLRenderer;
  private roomGroup: THREE.Group;
  private editorCamera: THREE.PerspectiveCamera;
  private userCamera: CameraComponent | null = null;
  private cubeCamera: THREE.CubeCamera;
  private previewPlayer: ThreeSpacePlayer | null = null;
  private outlineObjects: THREE.Object3D[] = [];
  private skybox: SkyBox;
  private vfx: VFXDust[] = [];

  /* UI and Utils */
  private settingsComponent: SettingsComponent;
  private projectView!: ProjectView;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;

  /* State */
  private config: EditorConfig;
  private inPreviewMode: boolean = false;
  private clickTimer: number = 0;
  private mousePosition: THREE.Vector2 = new THREE.Vector2();
  private raycastResults: THREE.Intersection<THREE.Object3D<THREE.Event>>[] = [];

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
      onImportImageByUrl: this.importImage,
      onUploadVideo:      this.uploadVideo,
      onImportVideoByUrl: this.importVideo,
      onUploadModel:      this.uploadModel,
      onImportModelByUrl: this.importModel,
      onAddLight:         this.addLight,
      onUploadAudio:      this.uploadAudio,
      onShowVFX:          () => { const m = document.getElementById(EditorIds.vfxSelection); if (m) m.style.visibility = 'visible'; },
      onSceneSettings:    this.showSceneSettings,
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
    this.postProcessingManager.SetupOutline(edgeStrength);

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

    this.skybox = new SkyBox(this.scene);

    this.settingsComponent = new SettingsComponent(
      SettingsComponent.DefaultProperties,
      () => {
        this.setSceneSettings(this.settingsComponent.SettingsProperties);
      },
      () => {
        this.uiController.SetResetScenePopupVisibility("visible");
      }
    );

    canvas.addEventListener("mousedown", (event) => {
      if (event.button === 1) event.preventDefault();
    });
    canvas.addEventListener('touchstart', this.touchStart);

    this.renderer.domElement.addEventListener('dragover', (e) => { e.preventDefault(); });
    this.renderer.domElement.addEventListener('drop', (e) => {
      e.preventDefault();
      const path = e.dataTransfer?.getData('text/plain');
      if (path) this.dropAsset(path);
    });

    if (!PlayerUtils.IsMobile(navigator)) {
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

    const pvToggle = document.getElementById(EditorIds.projectViewToggle) as HTMLButtonElement;
    const pvPanel  = document.getElementById(EditorIds.projectViewPanel)  as HTMLElement;
    const pvTree   = document.getElementById(EditorIds.projectViewTree)   as HTMLElement;
    this.projectView = new ProjectView(pvToggle, pvPanel, pvTree, AssetManager.AssetBasePath, this.dropAsset);

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
      this.PlayerProperties = config.playerProperties;
    } else if (config.onLoad) {
      config.onLoad().then(scene => {
        if (scene) this.PlayerProperties = scene;
      });
    }
  }

  /** The underlying WebGL canvas element. Style or reposition it as needed. */
  public get Canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /** Sets the player properties for the editor (can change at runtime). */
  public set PlayerProperties(playerProperties: PlayerProperties) {
    if (playerProperties !== null) {
      this.clearScene();
      this.AddComponents(playerProperties.components);
      this.setSceneSettings(playerProperties.sceneProperties);
      this.settingsComponent.SettingsProperties = playerProperties.sceneProperties;
    }
  }

  /** Add new components to the editor scene */
  public AddComponents = (components: ComponentProperties[]) => {
    for (let i = 0; i < components.length; i++) {
      this.addComponent(components[i]);
    }
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
      const defaultPath = AssetManager.AssetBasePath + file.name;
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
          this.projectView.registerAsset(exportUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  /* Handles image upload from file */
  public uploadImage = (files: File[]) => {
    this.uploadAndPlaceAsset(files, (dataURL, exportUrl) => {
      const p = ImageComponent.DefaultProperties;
      p.filepath = exportUrl;
      return new ImageComponent(p, null, this.editorCamera, dataURL);
    });
  }

  /* Handles image import from URL */
  public importImage = (url: string) => {
    const imageProperties = ImageComponent.DefaultProperties;
    imageProperties.url = url;
    const imageComponent = new ImageComponent(imageProperties, null, this.editorCamera)
    this.roomGroup.add(imageComponent);
    this.componentAdded(imageComponent);
    this.projectView.registerAsset(url);
  }

  /* Handles video upload from file */
  public uploadVideo = (files: File[]) => {
    this.uploadAndPlaceAsset(files, (dataURL, exportUrl) => {
      const p = VideoComponent.DefaultProperties;
      p.filepath = exportUrl;
      return new VideoComponent(p, this.editorCamera, dataURL);
    });
  }

  /* Handles video import from URL */
  public importVideo = (url: string) => {
    const properties = VideoComponent.DefaultProperties;
    properties.url = url;

    const videoComponent = new VideoComponent(properties, this.editorCamera)
    this.roomGroup.add(videoComponent);
    this.componentAdded(videoComponent);
    this.projectView.registerAsset(url);
  }

  /* Handles model upload from file */
  public uploadModel = (files: File[]) => {
    this.uploadAndPlaceAsset(files, (dataURL, exportUrl) => {
      const p = ModelComponent.DefaultProperties;
      p.filepath = exportUrl;
      return new ModelComponent(p, this.editorCamera, ()=>{}, dataURL);
    });
  }

  /* Handles model import from URL */
  public importModel = (url: string) => {
    const modelProperties = ModelComponent.DefaultProperties;
    modelProperties.url = url;
    const modelComponent = new ModelComponent(modelProperties, this.editorCamera, ()=>{});
    this.roomGroup.add(modelComponent);
    this.componentAdded(modelComponent);
    this.projectView.registerAsset(url);
  }

  /* Handles audio import from URL */
  public importAudio = (url: string) => {
    const audioProperties = AudioComponent.DefaultProperties;
    audioProperties.url = url;
    const component = new AudioComponent(audioProperties, this.editorCamera, url);
    this.roomGroup.add(component);
    this.componentAdded(component);
    this.projectView.registerAsset(url);
  }

  /* Handles audio upload from file */
  public uploadAudio = (files: File[]) => {
    this.uploadAndPlaceAsset(files, (dataURL, exportUrl) => {
      const p = AudioComponent.DefaultProperties;
      p.filepath = exportUrl;
      return new AudioComponent(p, this.editorCamera, dataURL);
    });
  }

  // TODO: Re-factor the types so they aren't hard-coded and are shared somewhere with the types in editorDom and elsewhere
  private dropAsset = (path: string) => {
    const lower = path.toLowerCase();
    if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
      this.importModel(path);
    } else if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
      this.importImage(path);
    } else if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm')) {
      this.importVideo(path);
    } else if (lower.endsWith('.mp3') || lower.endsWith('.ogg') || lower.endsWith('.wav')) {
      this.importAudio(path);
    }
  }

  /* Adds new light to the scene */
  public addLight = () => {
    const lightProperties = LightComponent.DefaultProperties;
    const lightComponent = new LightComponent(lightProperties);
    this.roomGroup.add(lightComponent);
    this.componentAdded(lightComponent);
  }

  /* Adds new VFX to the scene */
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

  /** Display the scene settings */
  public showSceneSettings = () => {
    this.uiController.ShowPropertiesWindow(this.settingsComponent);
  }

  /** Handles resize of screen */
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

    this.postProcessingManager.Resize(this.editorParent.clientWidth, this.editorParent.clientHeight);

    this.renderer.setSize(this.editorParent.clientWidth, this.editorParent.clientHeight, true);
  }

  /** Called every frame */
  private update = () => {
    requestAnimationFrame( this.update ); // Triggers the next update call

    // Early out so we can only handle "player" logic in the preview window
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
    this.componentManager.update(deltaTime);
    this.postProcessingManager.Update();
    if (this.userCamera) this.userCamera.update(deltaTime);
  }

  private getSceneProperties = () : PlayerProperties => {
    const sceneProperties = SharedData.DefaultPlayerProperties;

    const components = this.componentManager.Components;
    for (let i = 0; i < components.length; i++) {
      const json = components[i].toJSON();
      const properties = components[i].ComponentProperties;
      properties.transformMatrix = json.object.matrix;

      sceneProperties.components.push(properties);
    }

    sceneProperties.sceneProperties = this.settingsComponent.SettingsProperties;

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
        a.download = 'sceneon';
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
    let path = "";
    if ([ComponentType.Camera, ComponentType.Audio].indexOf(componentProperties.componentType) === -1) {
      path = SharedUtils.GetURLFromComponentProperties(componentProperties);
    }

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
        component = new VideoComponent(componentProperties as VideoProperties, this.editorCamera, path);
        break;
      case ComponentType.Image:
        component = new ImageComponent(componentProperties as ImageProperties, null, this.editorCamera, path)
        break;
      case ComponentType.Model:
        component = new ModelComponent(componentProperties as ModelProperties, this.editorCamera, ()=>{}, path);
        break;
      case ComponentType.Audio:
        component = new AudioComponent(componentProperties as AudioProperties, this.editorCamera, path);
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
      if (path) this.projectView.registerAsset(path);
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
      this.uiController.ShowPropertiesWindow(component);
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
        this.previewPlayer.Dispose();
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
    const colorOne = PlayerUtils.GetColorFromSerializableColor(sceneProperties.colorOne);
    switch (sceneProperties.backgroundColorType) {
      case BackgroundColorType.Single:
        this.setBackgroundColorSolid(colorOne);
        break;
      case BackgroundColorType.Gradient:
        this.setBackgroundColorGradient(
          colorOne, PlayerUtils.GetColorFromSerializableColor(sceneProperties.colorTwo));
        break;
    }
  }

  private setupDefaultScene = () => {
    this.setSceneSettings(SettingsComponent.DefaultProperties);
    this.settingsComponent.SettingsProperties = SettingsComponent.DefaultProperties;

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

    this.postProcessingManager.SetOutlineObjects(this.outlineObjects);
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
        this.uiController.Show3DToolsWindow();
        this.uiController.ShowPropertiesWindow(baseComponents[0]);
      } else {
        this.componentManager.setSelectedComponent(null);
        this.uiController.Hide3DToolsWindow();
        this.uiController.HidePropertiesWindow();
      }
    } else {
      this.componentManager.setSelectedComponent(null);
      this.uiController.Hide3DToolsWindow();
      this.uiController.HidePropertiesWindow();
    }

    this.uiController.ResetUIState();
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