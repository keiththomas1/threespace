import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ModelInfo } from "./utils/playerDefinitions";

export default class ModelLoader {
  gltfLoader: GLTFLoader;

  constructor(loadingManager: THREE.LoadingManager) {
    this.gltfLoader = new GLTFLoader(loadingManager);
  }

  public LoadGLTFFromArrayBuffer = (modelArrayBuffer: any, modelLoaded: (modelInfo: ModelInfo) => void) => {
    this.gltfLoader.parse(
      modelArrayBuffer,
      '',
      (gltf) => { modelLoaded({ object: gltf.scene, animations: gltf.animations}) },
      function ( error: any ) {
        console.warn( 'A GLTF/GLB load error happened' );
      }
    );
  }

  public LoadGLTFFromURL = (modelURL: string, modelLoaded: (modelInfo: ModelInfo) => any) => {
    this.gltfLoader.load(
      modelURL,
      (gltf) => { modelLoaded({ object: gltf.scene, animations: gltf.animations}) },
      function ( xhr: any ) {
      },
      function ( error: any ) {
        console.warn( 'A GLTF/GLB load error happened' );
      }
    );
  }
}