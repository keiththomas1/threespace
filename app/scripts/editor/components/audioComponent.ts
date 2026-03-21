import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { AudioProperties, ComponentType } from "../../player/utils/playerDefinitions";
import { AssetManager } from "../../shared/assetManager";
import { ComponentProperty } from "../utils/constants";
import ThreeUtilities from "../utils/threeUtilities";
import BaseComponent from "./baseComponent";
import { SharedUtils } from "../../shared/sharedUtils";

export default class AudioComponent extends BaseComponent {
  private readonly TOGGLE_PLAY = "Play/Pause";
  private readonly CREDITS_BUTTON_ENABLED = "Show Music Credit Info";

  private listener: THREE.AudioListener;
  private audioLoader: THREE.AudioLoader;
  private sound: THREE.Audio = null;
  private wasPlayingBeforeHide = false;

  protected audioProperties: AudioProperties = AudioComponent.DefaultProperties;

  constructor(audioProperties: AudioProperties, camera: THREE.Camera, dataURL: string = "") {
    super("Audio", null, { hasActions: false, hasCredit: true, hasTransform: true, hasUrl: true, hasDuplicate: true });

    this.componentType = ComponentType.Audio;
    this.assignProperties(audioProperties);
    this.setupEditorProperties();

    this.listener = new THREE.AudioListener();
    camera.add( this.listener );

    this.audioLoader = new THREE.AudioLoader();

    this.addMusic(dataURL === "" ? SharedUtils.GetURLFromComponentProperties(this.audioProperties) : dataURL, 1);

    this.createMusicModelRepresentation();

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public get ComponentProperties(): AudioProperties {
    return this.audioProperties;
  }

  public static get DefaultProperties() : AudioProperties {
    const defaultproperties = this.BaseDefaultProperties as AudioProperties;
    defaultproperties.componentType = ComponentType.Audio;
    return defaultproperties;
  }

  public PropertyChanged(propertyName: string, property: ComponentProperty) {
    super.PropertyChanged(propertyName, property);

    switch (propertyName) {
      case this.CREDITS_BUTTON_ENABLED:
        this.audioProperties.showCreditButton = property.value;
        break;
    }
  }

  public addMusic(musicURL: string, volume: number) {
    if (musicURL === "") {
      console.warn("Music coming in with empty URL");
      return;
    }

    this.sound = new THREE.Audio( this.listener );
    this.audioLoader.load( musicURL, ( buffer ) => {
      this.sound.setBuffer( buffer );
      this.sound.setLoop( true );
      this.sound.setVolume( volume );
    }, undefined, (err) => {
      console.warn('ThreeSpace: failed to load audio at', musicURL, err);
    });
  }

  protected setupEditorProperties(): void {
    super.setupEditorProperties(() => {
      this.editorProperties[this.TOGGLE_PLAY] = {
        value: this.toggleMusicPlaying,
        type: "Button",
        tooltip: "Toggles playing of music." };
      this.editorProperties[this.CREDITS_BUTTON_ENABLED] = {
        value: this.audioProperties.showCreditButton ?? false,
        type: "Boolean" };
    });
  }

  private handleVisibilityChange = () => {
    if (!this.sound) return;
    if (document.hidden) {
      this.wasPlayingBeforeHide = this.sound.isPlaying;
      if (this.sound.isPlaying) this.sound.pause();
    } else {
      if (this.wasPlayingBeforeHide) this.sound.play();
      this.wasPlayingBeforeHide = false;
    }
  }

  public dispose(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.sound?.isPlaying) this.sound.stop();
    super.dispose();
  }

  private toggleMusicPlaying = () => {
    if (this.sound.isPlaying) {
      this.sound.pause();
    } else {
      this.sound.play();
    }
  }

  private createMusicModelRepresentation() {
    const gltfLoader = new GLTFLoader();
    const self = this;
    gltfLoader.load(`${AssetManager.AssetBasePath}/models/headphones/headphones.glb`, (gltf: GLTF) => {
      ThreeUtilities.setBasicMaterialOnGLTF(gltf.scene, new THREE.Color("black"));
      self.mesh = gltf.scene;
      this.add( self.mesh );
      self.mesh.position.set(0, 0, 0);
      self.mesh.scale.set(4, 4, 4);
    });
  }

}