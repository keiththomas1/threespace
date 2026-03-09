import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ComponentFactory } from "../../player/components/componentFactory";
import { AudioProperties, ComponentType } from "../../player/utils/playerDefinitions";
import { ComponentProperty } from "../utils/constants";
import ThreeUtilities from "../utils/threeUtilities";
import BaseComponent from "./baseComponent";

export default class AudioComponent extends BaseComponent {
  private readonly TOGGLE_PLAY = "Play/Pause";

  private listener: THREE.AudioListener;
  private audioLoader: THREE.AudioLoader;
  private sound: THREE.Audio = null;

  protected playerProperties: AudioProperties = AudioComponent.DefaultProperties;

  constructor(audioProperties: AudioProperties, camera: THREE.Camera, dataURL: string = "") {
    super("Audio", null, { hasActions: false, hasCredit: true, hasTransform: true});

    this.componentType = ComponentType.Audio;
    this.assignProperties(audioProperties);
    this.setupEditorProperties();

    this.listener = new THREE.AudioListener();
    camera.add( this.listener );

    this.audioLoader = new THREE.AudioLoader();

    this.addMusic(dataURL === "" ? this.playerProperties.url : dataURL, 1);

    this.createMusicModelRepresentation();
  }

  public static get DefaultProperties() : AudioProperties {
    const defaultproperties = this.BaseDefaultProperties as AudioProperties;
    defaultproperties.componentType = ComponentType.Audio;
    return defaultproperties;
  }

  public propertyChanged(propertyName: string, property: ComponentProperty) {
    super.propertyChanged(propertyName, property);

    switch (propertyName) {
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
    });
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
    gltfLoader.load("/models/headphones/headphones.glb", (gltf: GLTF) => {
      ThreeUtilities.setBasicMaterialOnGLTF(gltf.scene, new THREE.Color("black"));
      self.mesh = gltf.scene;
      this.add( self.mesh );
      self.mesh.position.set(0, 0, 0);
      //self.mesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI);
      self.mesh.scale.set(4, 4, 4);
    });
  }

}