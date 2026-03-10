import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ComponentFactory } from "./components/componentFactory";
import { ActionType, CameraProperties, ComponentProperties, AnimationBehaviorType,
  ComponentType, ModelInfo, ModelProperties, PlayerProperties, Text3DProperties,
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
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera | null = null;

  private controls: OrbitControls | null = null;
  private clock: THREE.Clock;

  private canvas: HTMLCanvasElement;
  private modelLoader: ModelLoader;
  private postProcessingManager: PostProcessingManager | null = null;
  private actionManager: ActionManager;
  private skybox: SkyBox;

  private canvasParent: HTMLElement;
  private resizeObserver: ResizeObserver | null = null;

  private clickTimer: number = 0;
  private components: PlayerComponent[] = [];
  private componentSelected: (eventName: string) => any = () => {};
  private sceneLoaded: () => any = () => {};
  private setCreditInfo: (piece: string, author: string, site: string, license: string) => any = () => {};

  private previousCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private previousCameraRotation: THREE.Quaternion = new THREE.Quaternion();
  private inViewMode: boolean = false;
  private startDrag: THREE.Vector2 = new THREE.Vector2();

  private loadingManager: THREE.LoadingManager;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private raycastResults: THREE.Intersection<THREE.Object3D<THREE.Event>>[] = [];
  private mousePosition: THREE.Vector2 = new THREE.Vector2();
  private outlineObjects: THREE.Object3D[] = [];
  private animationMixers: THREE.AnimationMixer[] = [];
  private sounds: THREE.Audio[] = [];

  /** Sets the callback function to be called when a component is selected. */
  public set onComponentSelected(callback: (eventName: string) => any) {
    this.componentSelected = callback;
  }

  /** Sets the callback function to be called when the scene is loaded. */
  public set onSceneLoaded(callback: () => any) {
    this.sceneLoaded = callback;
  }

  /** Sets the callback function to be called when credit information is to be displayed. */
  public set onSetCreditInfo(callback: (piece: string, author: string, site: string, license: string) => any) {
    this.setCreditInfo = callback;
  }

  /**
   * @param canvasParent The parent element that the player's canvas will be added to. The canvas will be sized to fill this parent element.
   * @param playerSettings The settings for the player, including scene properties and component properties. 
   * @param canvas An optional canvas element to use for rendering. If not provided, a new canvas element will be created and added to the canvasParent. 
   * @param assetBasePath // Prepended to the filename when searching for assets such as models, videos, images, etc. in the player settings. 
   *                        This is used when the asset paths in the player settings are relative paths.
   *                        e.g. "/models/" → file "robot.glb" is imported as "/models/robot.glb". 
   *                        If not set, will use the root as the base path.
   */
  public constructor(
    canvasParent: HTMLElement,
    playerSettings: PlayerProperties,
    canvas: HTMLCanvasElement = null,
    assetBasePath?: string) {
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
    canvasParent.onmousemove = this.canvasMouseMove;
    canvasParent.onmousedown = this.canvasMouseDown;
    canvasParent.onmouseup = this.canvasMouseUp;

    this.clock = new THREE.Clock(true);
    this.loadingManager = new THREE.LoadingManager(() => {
      this.sceneLoaded();
    });

    if (!PlayerUtils.isMobile(navigator)) {
      window.addEventListener("resize", this.resize);
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvasParent);
    }

    this.skybox = new SkyBox(this.scene);
    this.modelLoader = new ModelLoader(this.loadingManager);
    this.addComponents(playerSettings.components);
    this.setSceneSettings(playerSettings.sceneProperties);

    if (this.camera) {
      this.postProcessingManager = new PostProcessingManager(
        this.renderer, this.scene, this.camera);
      const edgeStrength = 2;
      this.postProcessingManager.setupOutline(edgeStrength);
    }
    this.actionManager = new ActionManager(this.componentSelected, this.enterViewMode);

    this.setupXR();
    this.resize();
    this.update();
  }

  public get Canvas() {
    return this.canvas;
  }

  public static getDefaultSpaceProperties(): PlayerProperties {
    return {
      schemaVersion: SCHEMA_VERSION,
      sceneProperties: DEFAULT_SCENE_PROPERTIES,
      components: []
    };
  }

  public set Muted(muted: boolean) {
    for (let i = 0; i < this.sounds.length; i++) {
      this.sounds[i].setVolume(muted ? 0 : 1);
    }
  }

  public dispose() {
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

  private addComponents(componentProperties: ComponentProperties[]) {
    for (let i = 0; i < componentProperties.length; i++) {
      switch (componentProperties[i].componentType) {
        case ComponentType.Camera:
          const cameraProperties = componentProperties[i] as CameraProperties;
          this.camera = ComponentFactory.createPlayerCamera(cameraProperties);

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
          const color = PlayerUtils.getColorFromSerializableColor(lightProperties.color);
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
          ComponentFactory.create3DTextMesh(componentProperties[i] as Text3DProperties, this.scene).then(
            (textMesh: THREE.Mesh) => {
              const playerComponent = this.createPlayerComponent(textMesh, componentProperties[i]);

              this.components.push(playerComponent);
            }
          );
          break;
        case ComponentType.VFX:
          const vfxObject = ComponentFactory.createVFX(componentProperties[i] as VFXProperties, this.renderer);

          const playerComponent = this.createPlayerComponent(vfxObject, componentProperties[i]);
          playerComponent.UpdateCallback = (deltaTime: number) => {
            vfxObject.update(deltaTime);
          };

          this.components.push(playerComponent);
          break;
        case ComponentType.Video:
          ComponentFactory.loadAsset(
            componentProperties[i].url,
            (url: string) => { this.createVideoComponent(url, componentProperties[i]); }
          );
          break;
        case ComponentType.Image:
          ComponentFactory.loadAsset(
            componentProperties[i].url,
            (url: string) => { this.createImageComponent(url, componentProperties[i]); }
          );
          break;
        case ComponentType.Model:
          const modelProperties = componentProperties[i] as ModelProperties;
          ComponentFactory.loadModelInfo(this.modelLoader, modelProperties).then(
            (modelInfo: ModelInfo | null) => {
              if (modelInfo) {
                this.loadModel(modelInfo, modelProperties);
              }
            }
          );
          break;
        case ComponentType.Audio:
          const audioLoader = new THREE.AudioLoader();
          const audioProperties = componentProperties[i] as AudioProperties;
          ComponentFactory.loadAudio(audioProperties).then((url: string) => {
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

  private loadModel = (modelInfo: ModelInfo, componentProperties: ModelProperties) => {
    const playerComponent = this.createPlayerComponent(modelInfo.object, componentProperties);
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
          playerComponent.addClickCallback(() => {
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

  private setupXR = () => {
    const arButton = ARButton.createButton( this.renderer );
    if (arButton) document.body.appendChild(arButton);

    const vrButton = VRButton.createButton( this.renderer ) ;
    VRButton.registerSessionGrantedListener();
    if (vrButton) document.body.appendChild(vrButton);

    this.renderer.xr.enabled = true;
    this.renderer.setAnimationLoop(() => {
      if (this.camera) this.renderer.render( this.scene, this.camera );
    });
  }

  private createPlayerComponent = (
    object: THREE.Object3D, componentProperties: ComponentProperties): PlayerComponent => {
    const playerComponent = new PlayerComponent(object, componentProperties);
    this.scene.add(playerComponent);

    const matrix = new THREE.Matrix4().fromArray(componentProperties.transformMatrix);
    playerComponent.applyMatrix4(matrix);

    return playerComponent;
  }

  private createImageComponent = (url: string, imageProperties: ImageProperties) => {
    const imageMesh = ComponentFactory.createImageMesh(url);

    const playerComponent = this.createPlayerComponent(imageMesh, imageProperties);
    this.components.push(playerComponent);
  }

  private createVideoComponent = (url: string, videoProperties: VideoProperties) => {
    const videoElement = ComponentFactory.createVideoElement(url);
    const videoMesh = ComponentFactory.createVideoMesh(videoElement);

    const playerComponent = this.createPlayerComponent(videoMesh, videoProperties);
    this.components.push(playerComponent);
  }

  private canvasMouseMove = (e: MouseEvent) => {
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

      this.postProcessingManager.setOutlineObjects(this.outlineObjects);
    }
  }

  private canvasMouseDown = (e: MouseEvent) => {
    this.clickTimer = this.clock.getElapsedTime();

    this.startDrag.x = e.pageX;
    this.startDrag.y = e.pageY;
  }

  private canvasMouseUp = (e: MouseEvent) => {
    if (this.clock.getElapsedTime() - this.clickTimer >= 0.3) {
      return;
    }

    if (this.raycastResults.length > 0) {
      const baseComponents: PlayerComponent[] = [];
      this.getBaseComponentParent(this.raycastResults[0].object, baseComponents);

      if (baseComponents.length > 0) {
        this.actionManager.handleAction(baseComponents[0]);
        baseComponents[0].clicked();
      }
    }
  }

  private enterViewMode = (matrix: THREE.Matrix4) => {
    if (!this.inViewMode) {
      const position = new THREE.Vector3();
      const rotation = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      matrix.decompose(position, rotation, scale);

      this.previousCameraPosition.copy(this.camera.position);
      this.previousCameraRotation.copy(this.camera.quaternion);

      this.animateCamera(position, rotation, () => {});

      this.controls.enabled = false;
      this.inViewMode = true;
    }
  }

  private animateCamera = (position: THREE.Vector3, rotation: THREE.Quaternion, onComplete: ()=>any) => {
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

  private setBackgroundColorSolid = (color: THREE.Color) => {
    this.scene.background = color;
    this.skybox.Enabled = false;
  }

  private setBackgroundColorGradient = (colorOne: THREE.Color, colorTwo: THREE.Color) => {
    this.skybox.Enabled = true;
    this.skybox.ColorOne = colorOne;
    this.skybox.ColorTwo = colorTwo;
  }

  private getBaseComponentParent(object: THREE.Object3D, baseComponents: PlayerComponent[]) {
    if (object instanceof PlayerComponent) {
      baseComponents.push(object);
      return;
    }
    if (object.parent) {
      this.getBaseComponentParent(object.parent, baseComponents);
    }
  }

  private resize = () => {
    const w = this.canvasParent.clientWidth;
    const h = this.canvasParent.clientHeight;
    if (this.camera && this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.setSize(w, h, false);

    if (this.postProcessingManager) {
      this.postProcessingManager.resize(w, h);
    }
  }

  private update = () => {
    const deltaTime = this.clock.getDelta();
    requestAnimationFrame( this.update );

    if (this.animationMixers) {
      for (let i = 0; i < this.animationMixers.length; i++) {
        if (this.animationMixers[i]) this.animationMixers[i].update(deltaTime);
      }
    }

    for (let i = 0; i < this.components.length; i++) {
      this.components[i].update(deltaTime);
    }

    if (this.scene && this.renderer && this.camera) {
      this.renderer.render( this.scene, this.camera );
    }

    if (this.postProcessingManager) {
      this.postProcessingManager.update();
    }
  }
}