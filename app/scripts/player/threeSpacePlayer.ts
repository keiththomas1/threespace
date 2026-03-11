import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ComponentFactory } from "./components/componentFactory";
import { ActionType, CameraProperties, ComponentProperties, AnimationBehaviorType,
  ComponentType, FontDefinition, ModelInfo, ModelProperties, PlayerProperties, Text3DProperties,
  BackgroundColorType, SceneProperties, VideoProperties, AudioProperties, LightProperties, LightType, VFXProperties, ImageProperties,
  SCHEMA_VERSION, DEFAULT_SCENE_PROPERTIES
  } from "./utils/playerDefinitions";
import anime from 'animejs';

import { PlayerIds } from './playerIds';
import PlayerUtils from "./utils/playerUtils";
import ModelLoader from "./modelLoader";
import PostProcessingManager from "./postProcessingManager";
import PlayerComponent from "./components/playerComponent";
import ActionManager from "./actionManager";
import SkyBox from "./skyBox";
import ARButton from './arButton';
import VRButton from './vrButton';

/**
 * The ThreeSpace player. Loads player properties (the JSON exported from the editor) and renders the scene accordingly. 
 * Also handles user interactions and component actions.
 */
export class ThreeSpacePlayer {
  /* Managers and core objects */
  private canvas: HTMLCanvasElement;
  private canvasParent: HTMLElement;
  private controls: OrbitControls | null = null;
  private loadingManager: THREE.LoadingManager;
  private modelLoader: ModelLoader;
  private postProcessingManager: PostProcessingManager | null = null;
  private actionManager: ActionManager;
  private resizeObserver: ResizeObserver | null = null;

  /* 3D Scene objects */
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.Camera | null = null;
  private skybox: SkyBox;

  /* UI and Utils */
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private clock: THREE.Clock;

  /* State */
  private raycastResults: THREE.Intersection<THREE.Object3D<THREE.Event>>[] = [];
  private mousePosition: THREE.Vector2 = new THREE.Vector2();
  private outlineObjects: THREE.Object3D[] = [];
  private animationMixers: THREE.AnimationMixer[] = [];
  private sounds: THREE.Audio[] = [];
  private clickTimer: number = 0;
  private components: PlayerComponent[] = [];
  private previousCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private previousCameraRotation: THREE.Quaternion = new THREE.Quaternion();
  private inViewMode: boolean = false;
  private startDrag: THREE.Vector2 = new THREE.Vector2();
  private assetBasePath: string = '';
  private fonts: FontDefinition[] = [];

  /* Callbacks */
  private componentSelected: (eventName: string) => any = () => {};
  private sceneLoaded: () => any = () => {};
  private setCreditInfo: (piece: string, author: string, site: string, license: string) => any = () => {};

  /**
   * @param canvasParent The parent element that the player's canvas will be added to. The canvas will be sized to fill this parent element.
   * @param playerSettings The settings for the player, including scene properties and component properties.
   * @param canvas An optional canvas element to use for rendering. If not provided, a new canvas element will be created and added to the canvasParent.
   * @param assetBasePath Prepended to the filename when searching for assets such as models, videos, images, etc. in the player settings.
   *                        This is used when the asset paths in the player settings are relative paths.
   *                        e.g. "/models/" → file "robot.glb" is imported as "/models/robot.glb".
   *                        If not set, will use the root as the base path.
   * @param fonts The fonts available for Text3D components. Each entry provides a display name and a path relative to assetBasePath.
   */
  public constructor(
    canvasParent: HTMLElement,
    playerSettings: PlayerProperties,
    canvas: HTMLCanvasElement = null,
    assetBasePath: string = '',
    fonts: FontDefinition[] = []) {
    this.assetBasePath = assetBasePath;
    this.fonts = fonts;
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer();
    if (canvas) {
      this.canvas = canvas;
    } else {
      this.canvas = this.renderer.domElement;
      this.canvas.id = PlayerIds.playerCanvas;
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
    }
    this.canvasParent = canvasParent;
    canvasParent.appendChild(this.canvas);
    canvasParent.onmousemove = this.CanvasMouseMove;
    canvasParent.onmousedown = this.CanvasMouseDown;
    canvasParent.onmouseup = this.CanvasMouseUp;

    this.clock = new THREE.Clock(true);
    this.loadingManager = new THREE.LoadingManager(() => {
      this.sceneLoaded();
    });

    if (!PlayerUtils.IsMobile(navigator)) {
      window.addEventListener("resize", this.Resize);
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.Resize());
      this.resizeObserver.observe(canvasParent);
    }

    this.skybox = new SkyBox(this.scene);
    this.modelLoader = new ModelLoader(this.loadingManager);
    this.AddComponents(playerSettings.components);
    this.SetSceneSettings(playerSettings.sceneProperties);

    if (this.camera) {
      this.postProcessingManager = new PostProcessingManager(
        this.renderer, this.scene, this.camera);
      const edgeStrength = 2;
      this.postProcessingManager.SetupOutline(edgeStrength);
    }
    this.actionManager = new ActionManager(this.componentSelected, this.EnterViewMode);

    this.SetupXR();
    this.Resize();
    this.Update();
  }
  
  /** Sets the callback function to be called when a component is selected. */
  public set OnComponentSelected(callback: (eventName: string) => any) {
    this.componentSelected = callback;
  }

  /** Sets the callback function to be called when the scene is loaded. */
  public set OnSceneLoaded(callback: () => any) {
    this.sceneLoaded = callback;
  }

  /** Sets the callback function to be called when credit information is to be displayed. */
  public set OnSetCreditInfo(callback: (piece: string, author: string, site: string, license: string) => any) {
    this.setCreditInfo = callback;
  }

  /** The underlying WebGL canvas element. Style or reposition it as needed. */
  public get Canvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /** Sets whether the player is muted. */
  public set Muted(muted: boolean) {
    for (let i = 0; i < this.sounds.length; i++) {
      this.sounds[i].setVolume(muted ? 0 : 1);
    }
  }

  public Dispose() {
    for (let i = 0; i < this.sounds.length; i++) {
      if (this.sounds[i].isPlaying) {
        this.sounds[i].stop();
      }
    }
    this.sounds = [];

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.Canvas.remove();
  }

  private AddComponents(componentProperties: ComponentProperties[]) {
    for (let i = 0; i < componentProperties.length; i++) {
      switch (componentProperties[i].componentType) {
        case ComponentType.Camera:
          const cameraProperties = componentProperties[i] as CameraProperties;
          this.camera = ComponentFactory.CreatePlayerCamera(cameraProperties);

          const matrix = new THREE.Matrix4().fromArray(componentProperties[i].transformMatrix);
          this.camera.applyMatrix4(matrix);

          if (this.camera) {
            this.scene.add(this.camera);
            this.controls = new OrbitControls( this.camera, this.canvas );
            this.controls.enablePan = false;
            this.controls.maxPolarAngle = Math.PI / 2;
            this.controls.maxDistance = 50;
            if (cameraProperties.target) {
              this.controls.target = new THREE.Vector3(
                cameraProperties.target.x, cameraProperties.target.y, cameraProperties.target.z);
              this.controls.update();
            }
          }
          break;
        case ComponentType.Light:
          const lightProperties = componentProperties[i] as LightProperties;

          let light = null;
          const color = PlayerUtils.GetColorFromSerializableColor(lightProperties.color);
          switch (lightProperties.type) {
            case LightType.AMBIENT:
              light = new THREE.AmbientLight(color, lightProperties.intensity);
              break;
            case LightType.DIRECTIONAL:
              light = new THREE.DirectionalLight(color, lightProperties.intensity);
              break;
          }

          if (light) {
            const matrix = new THREE.Matrix4().fromArray(componentProperties[i].transformMatrix);
            light.applyMatrix4(matrix);

            this.scene.add(light);
          }
          break;
        case ComponentType.Text3D:
          ComponentFactory.Create3DTextMesh(componentProperties[i] as Text3DProperties, this.scene, this.fonts, this.assetBasePath).then(
            (textMesh: THREE.Mesh) => {
              const playerComponent = this.CreatePlayerComponent(textMesh, componentProperties[i]);

              this.components.push(playerComponent);
            }
          );
          break;
        case ComponentType.VFX:
          const vfxObject = ComponentFactory.CreateVFX(componentProperties[i] as VFXProperties, this.renderer);

          const playerComponent = this.CreatePlayerComponent(vfxObject, componentProperties[i]);
          playerComponent.UpdateCallback = (deltaTime: number) => {
            vfxObject.Update(deltaTime);
          };

          this.components.push(playerComponent);
          break;
        case ComponentType.Video:
          this.CreateVideoComponent(componentProperties[i].url ?? componentProperties[i].filepath, componentProperties[i]);
          break;
        case ComponentType.Image:
          this.CreateImageComponent(componentProperties[i].url ?? componentProperties[i].filepath, componentProperties[i]);
          break;
        case ComponentType.Model:
          const modelProperties = componentProperties[i] as ModelProperties;
          ComponentFactory.LoadModelInfo(this.modelLoader, modelProperties).then(
            (modelInfo: ModelInfo | null) => {
              if (modelInfo) {
                this.LoadModel(modelInfo, modelProperties);
              }
            }
          );
          break;
        case ComponentType.Audio:
          const audioLoader = new THREE.AudioLoader();
          const audioProperties = componentProperties[i] as AudioProperties;
          ComponentFactory.LoadAudio(audioProperties).then((url: string) => {
            const listener = new THREE.AudioListener();
            this.camera.add( listener );
            const sound = new THREE.Audio( listener );
            audioLoader.load( url, ( buffer ) => {
              sound.setBuffer( buffer );
              sound.setLoop( true );
              sound.setVolume( 1 );
              sound.play();
            }, undefined, (err) => {
              console.warn('ThreeSpace: failed to load audio at', url, err);
            });
            this.sounds.push(sound);
          });
          break;
      }
    }
  }

  private LoadModel = (modelInfo: ModelInfo, componentProperties: ModelProperties) => {
    const playerComponent = this.CreatePlayerComponent(modelInfo.object, componentProperties);
    playerComponent.CreditInfo = componentProperties.credit;

    if (modelInfo.animations && modelInfo.animations.length > 0) {
      const animationMixer = new THREE.AnimationMixer(modelInfo.object);
      let action: THREE.AnimationAction | null = null;
      for (let j = 0; j < modelInfo.animations.length; j++) {
        if (modelInfo.animations[j].name === componentProperties.currentAnimationName) {
          action = animationMixer.clipAction(modelInfo.animations[j]);
          action.play();
          action.paused = true;
          break;
        }
      }

      switch (componentProperties.animationBehaviorType) {
        case AnimationBehaviorType.PLAY_ON_CLICK:
          playerComponent.AddClickCallback(() => {
            if (action) {
              action.paused = !action.paused;
            }
          });
          break;
        case AnimationBehaviorType.PLAY_ON_START:
          if (action) {
            action.paused = false;
          }
          break;
      }

      this.animationMixers.push(animationMixer);
    }

    this.components.push(playerComponent);
  }

  private SetupXR = () => {
    const arButton = ARButton.CreateButton( this.renderer );
    if (arButton) document.body.appendChild(arButton);

    const vrButton = VRButton.createButton( this.renderer ) ;
    VRButton.registerSessionGrantedListener();
    if (vrButton) document.body.appendChild(vrButton);

    this.renderer.xr.enabled = true;
    this.renderer.setAnimationLoop(() => {
      if (this.camera) this.renderer.render( this.scene, this.camera );
    });
  }

  private CreatePlayerComponent = (
    object: THREE.Object3D, componentProperties: ComponentProperties): PlayerComponent => {
    const playerComponent = new PlayerComponent(object, componentProperties);
    this.scene.add(playerComponent);

    const matrix = new THREE.Matrix4().fromArray(componentProperties.transformMatrix);
    playerComponent.applyMatrix4(matrix);

    return playerComponent;
  }

  private CreateImageComponent = (url: string, imageProperties: ImageProperties) => {
    const imageMesh = ComponentFactory.CreateImageMesh(url);

    const playerComponent = this.CreatePlayerComponent(imageMesh, imageProperties);
    this.components.push(playerComponent);
  }

  private CreateVideoComponent = (url: string, videoProperties: VideoProperties) => {
    const videoElement = ComponentFactory.CreateVideoElement(url);
    const videoMesh = ComponentFactory.CreateVideoMesh(videoElement);

    const playerComponent = this.CreatePlayerComponent(videoMesh, videoProperties);
    this.components.push(playerComponent);
  }

  private CanvasMouseMove = (e: MouseEvent) => {
    const scrollTop = (window.pageYOffset !== undefined) ?
      window.pageYOffset :
      (document.documentElement || document.body).scrollTop;
    this.setCreditInfo("", "", "", "");

    if (this.postProcessingManager && this.camera) {
      this.mousePosition.x = ( ( (e.clientX - this.canvas.offsetLeft) / this.canvas.clientWidth ) * 2) - 1;
      this.mousePosition.y = - ( ( (e.clientY - this.canvas.offsetTop + scrollTop) / this.canvas.clientHeight ) * 2) + 1;

      this.raycaster.setFromCamera( this.mousePosition, this.camera );
      this.raycastResults.length = 0;
      this.raycaster.intersectObjects( this.components, true, this.raycastResults);

      this.outlineObjects = [];
      if (this.raycastResults.length > 0) {
        let parent = this.raycastResults[0].object;
        while (parent.parent && parent.parent !== this.scene) {
          parent = parent.parent;
        }

        if (parent instanceof PlayerComponent) {
          if ((parent.ComponentProperties.action !== null
            && parent.ComponentProperties.action.actionType != ActionType.NONE)
              || parent.ClickCallbacks.length > 0) {
            this.outlineObjects = [parent];
          }

          if (parent.CreditInfo &&
            (parent.CreditInfo.pieceName !== ""
            || parent.CreditInfo.authorName !== ""
            || parent.CreditInfo.websiteName !== "")) {
            this.setCreditInfo(
              parent.CreditInfo.pieceName, parent.CreditInfo.authorName, parent.CreditInfo.websiteName, parent.CreditInfo.licenseName);
          }
        }
      }

      this.postProcessingManager.SetOutlineObjects(this.outlineObjects);
    }
  }

  private CanvasMouseDown = (e: MouseEvent) => {
    this.clickTimer = this.clock.getElapsedTime();

    this.startDrag.x = e.pageX;
    this.startDrag.y = e.pageY;
  }

  private CanvasMouseUp = (e: MouseEvent) => {
    if (this.clock.getElapsedTime() - this.clickTimer >= 0.3) {
      return;
    }

    if (this.raycastResults.length > 0) {
      const baseComponents: PlayerComponent[] = [];
      this.GetBaseComponentParent(this.raycastResults[0].object, baseComponents);

      if (baseComponents.length > 0) {
        this.actionManager.HandleAction(baseComponents[0]);
        baseComponents[0].Clicked();
      }
    }
  }

  private EnterViewMode = (matrix: THREE.Matrix4) => {
    if (!this.inViewMode) {
      const position = new THREE.Vector3();
      const rotation = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      matrix.decompose(position, rotation, scale);

      this.previousCameraPosition.copy(this.camera.position);
      this.previousCameraRotation.copy(this.camera.quaternion);

      this.AnimateCamera(position, rotation, () => {});

      this.controls.enabled = false;
      this.inViewMode = true;
    }
  }

  private AnimateCamera = (position: THREE.Vector3, rotation: THREE.Quaternion, onComplete: ()=>any) => {
    const animation = anime({
      targets: this.camera.position,
      easing: 'linear',
      duration: 1000,
      x: position.x,
      y: position.y,
      z: position.z,
      complete: onComplete
    });
    const animation2 = anime({
      targets: this.camera.quaternion,
      easing: 'linear',
      duration: 1000,
      x: rotation.x,
      y: rotation.y,
      z: rotation.z,
      w: rotation.w,
      complete: function(anim) {
      }
    });
  }

  private SetSceneSettings = (sceneProperties: SceneProperties) => {
    const colorOne = PlayerUtils.GetColorFromSerializableColor(sceneProperties.colorOne);
    switch (sceneProperties.backgroundColorType) {
      case BackgroundColorType.Single:
        this.BackgroundColorSolid = colorOne;
        break;
      case BackgroundColorType.Gradient:
        this.SetBackgroundColorGradient(
          colorOne, PlayerUtils.GetColorFromSerializableColor(sceneProperties.colorTwo));
        break;
    }
  }

  private set BackgroundColorSolid(color: THREE.Color) {
    this.scene.background = color;
    this.skybox.Enabled = false;
  }

  private SetBackgroundColorGradient = (colorOne: THREE.Color, colorTwo: THREE.Color) => {
    this.skybox.Enabled = true;
    this.skybox.ColorOne = colorOne;
    this.skybox.ColorTwo = colorTwo;
  }

  private GetBaseComponentParent = (object: THREE.Object3D, baseComponents: PlayerComponent[]) => {
    if (object instanceof PlayerComponent) {
      baseComponents.push(object);
      return;
    }
    if (object.parent) {
      this.GetBaseComponentParent(object.parent, baseComponents);
    }
  }

  private Resize = () => {
    const w = this.canvasParent.clientWidth;
    const h = this.canvasParent.clientHeight;
    if (this.camera && this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.setSize(w, h, false);

    if (this.postProcessingManager) {
      this.postProcessingManager.Resize(w, h);
    }
  }

  private Update = () => {
    const deltaTime = this.clock.getDelta();
    requestAnimationFrame( this.Update );

    if (this.animationMixers) {
      for (let i = 0; i < this.animationMixers.length; i++) {
        if (this.animationMixers[i]) this.animationMixers[i].update(deltaTime);
      }
    }

    for (let i = 0; i < this.components.length; i++) {
      this.components[i].Update(deltaTime);
    }

    if (this.scene && this.renderer && this.camera) {
      this.renderer.render( this.scene, this.camera );
    }

    if (this.postProcessingManager) {
      this.postProcessingManager.Update();
    }
  }
}