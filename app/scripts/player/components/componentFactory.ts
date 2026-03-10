import * as THREE from "three";
import { Color } from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { Font } from "three/examples/jsm/loaders/FontLoader";
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader';

import ModelLoader from "../modelLoader";
import PlayerUtils from "../utils/playerUtils";
import {
  CameraProperties,
  CameraType,
  FontType,
  ModelProperties,
  Text3DProperties,
  ModelInfo,
  TEXT3D_FRONT_MAT_NAME,
  TEXT3D_SIDE_MAT_NAME,
  AudioProperties,
  VFXProperties,
  VFXType} from "../utils/playerDefinitions";
import { VFXObject } from "./VFXObject";
import { BasicVfxData, DustVfxData, RainVfxData, SnowVfxData } from "../utils/vfxInfo";
import VFXFishObject from "./vfxFishObject";
import VFXBaseObject from "./vfxBaseObject";

export class ComponentFactory {
  constructor() {
  }

  public static createPlayerCamera(cameraSettings: CameraProperties): THREE.Camera {
    let camera = null;
    switch (cameraSettings.type) {
      case CameraType.PERSPECTIVE:
        camera = new THREE.PerspectiveCamera(cameraSettings.fov, 1, 0.1, 1000 );
        break;
      case CameraType.ORTHOGRAPHIC:
        camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 1000 );
        break;
      default:
        console.warn("Unknown camera type when importing");
        return new THREE.PerspectiveCamera();
    }

    return camera;
  }

  public static loadModelInfo = async (
    modelLoader: ModelLoader, modelProperties: ModelProperties): Promise<ModelInfo | null> => {
    return new Promise<ModelInfo | null> ((resolve) => {
      modelLoader.loadGLTFFromURL(modelProperties.url ?? modelProperties.filepath, (modelInfo: ModelInfo) => { resolve(modelInfo); });
    });
  }

  public static loadAudio = async (audioProperties: AudioProperties): Promise<string | null> => {
    return new Promise<string | null> ((resolve) => {
      resolve(audioProperties.url ?? audioProperties.filepath);
    });
  }

  public static createImageMesh = (
    imageUrl: string,
    materialLoaded: (mat: THREE.MeshBasicMaterial)=>any = ()=>{}) : THREE.Mesh => {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    textureLoader.setRequestHeader(
      {
        origin: ""
      }
    );

    const geometry = new THREE.PlaneGeometry( 1, 1 );
    const mesh = new THREE.Mesh( geometry );

    textureLoader.load(
      imageUrl,
      (texture: THREE.Texture) => {
        const material = new THREE.MeshBasicMaterial( { map: texture } );
        if (material.map) material.map.encoding = THREE.sRGBEncoding;
        material.color = new THREE.Color(0xffffff);
        material.transparent = true;

        mesh.material = material;
        materialLoaded(material);
      },
      function (progress: ProgressEvent) {
        console.info(progress);
      },
      function (e: ErrorEvent) {
        console.error(e);
      }
    );

    return mesh;
  }

  public static createVideoMesh = (videoElement: HTMLVideoElement) => {
    const geometry = new THREE.PlaneGeometry( 1, 1 );
    const mesh = new THREE.Mesh( geometry );

    const videoTexture = new THREE.VideoTexture(videoElement);

    // There's a bug in Firefox right now where the default RGBFormat makes for poor performance
    // https://github.com/mrdoob/three.js/pull/21746
    if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
      videoTexture.format = THREE.RGBAFormat;
    }

    const videoMaterial = new THREE.MeshBasicMaterial( { map: videoTexture } );
    if (videoMaterial.map) {
      videoMaterial.map.encoding = THREE.sRGBEncoding;
    }

    if (mesh instanceof THREE.Mesh) mesh.material = videoMaterial;

    return mesh;
  }

  public static createVideoElement = (videoSrc: string): HTMLVideoElement => {
    const videoElement = document.createElement( 'video' );
    videoElement.id = "video-element-" + videoSrc;
    videoElement.src = videoSrc;
    videoElement.preload = "auto";
    videoElement.loop = true;
    videoElement.crossOrigin = "anonymous";
    videoElement.volume = 0;
    videoElement.load();
    videoElement.play();

    return videoElement;
  }

  public static async create3DTextMesh(textProperties: Text3DProperties, parent: THREE.Object3D): Promise<THREE.Mesh> {
    return new Promise<THREE.Mesh>((resolve, reject) => {
      const fontPath = ComponentFactory.getFontPathFromType(textProperties.type);
      const ttfLoader = new TTFLoader();
      ttfLoader.load(fontPath, (fontJson: object) => {
        const font = new Font(fontJson);

        const fontProperties = {
          font: font,
          size: textProperties.size,
          height: textProperties.height,

          curveSegments: 3,
          bevelThickness: 1,
          bevelSize: 2,
          bevelEnabled: true
        };

        const geometry = new TextGeometry(textProperties.text, fontProperties);
        geometry.computeBoundingBox();

        const frontColor = new Color(textProperties.frontColor.r, textProperties.frontColor.g, textProperties.frontColor.b);
        const frontMaterial = new THREE.MeshBasicMaterial( { name: TEXT3D_FRONT_MAT_NAME, color: frontColor } );
        const sideColor = new Color(textProperties.sideColor.r, textProperties.sideColor.g, textProperties.sideColor.b);
        const sideMaterial = new THREE.MeshBasicMaterial( { name: TEXT3D_SIDE_MAT_NAME, color: sideColor } );
        const textMesh = new THREE.Mesh( geometry, [ frontMaterial, sideMaterial ] );

        parent.add(textMesh);

        const hitbox = PlayerUtils.createHitBoxForObject3D(textMesh);
        textMesh.add(hitbox);

        resolve(textMesh);
      });
    });
  }

  public static createVFX(vfxProperties: VFXProperties, renderer: THREE.WebGLRenderer) : VFXBaseObject {
    let vfxData = null;
    switch (vfxProperties.type) {
      case VFXType.Dust:
        vfxData = DustVfxData;
        break;
      case VFXType.Snow:
        vfxData = SnowVfxData;
        break;
      case VFXType.Rain:
        vfxData = RainVfxData;
        break;
      case VFXType.Fish:
        return new VFXFishObject({}, renderer);
      case VFXType.Basic:
      default:
        vfxData = BasicVfxData;
        break;
    }

    return new VFXObject(vfxProperties, vfxData);
  }

  private static getFontPathFromType = (fontType: FontType) : string => {
    switch (fontType) {
      case FontType.AMATIC_SC:
        return '/fonts/Amatic_SC/AmaticSC-Regular.ttf';
      case FontType.DANCING_SCRIPT:
        return '/fonts/Dancing_Script/DancingScript-VariableFont_wght.ttf';
      case FontType.INDIE_FLOWER:
        return '/fonts/Indie_Flower/IndieFlower-Regular.ttf';
      case FontType.OPEN_SANS:
        return '/fonts/Open_Sans/OpenSans-VariableFont.ttf';
      case FontType.ROBOTO:
        return '/fonts/Roboto/Roboto-Regular.ttf';
      case FontType.NOTO_SANS:
      default:
        return '/fonts/NotoSans-Regular.ttf';
    }
  }
}