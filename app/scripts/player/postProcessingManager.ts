
import * as THREE from "three";

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

export default class PostProcessingManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  private composer: any;
  private outlinePass: any = null;
  private effectFXAA: any;

  private previousOutlineObjects: THREE.Object3D[] = [];

  constructor(renderer: THREE.Renderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;

    this.composer = new EffectComposer( renderer );

    const renderPass = new RenderPass( scene, camera );
    this.composer.addPass( renderPass );

    this.effectFXAA = new ShaderPass( FXAAShader );
    this.effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
    this.composer.addPass( this.effectFXAA );
  }

  public SetupOutline(edgeStrength: number = 3, edgeColor: string = "#15ff1c") {
    this.outlinePass = new OutlinePass(
      new THREE.Vector2( window.innerWidth, window.innerHeight ), this.scene, this.camera );
    this.outlinePass.edgeStrength = edgeStrength;
    this.outlinePass.visibleEdgeColor.set(edgeColor);
    this.composer.addPass( this.outlinePass );
  }

  public SetOutlineObjects(objects: THREE.Object3D[]) {
    if (this.outlinePass) {
      let equivalent = true;
      if (this.previousOutlineObjects.length !== objects.length) {
        equivalent = false;
      } else {
        for (let i = 0; i < objects.length; i++) {
          if (objects[i] !== this.previousOutlineObjects[i]) {
            equivalent = false;
            break;
          }
        }
      }

      if (!equivalent) {
        this.outlinePass.selectedObjects = objects;

        this.previousOutlineObjects = objects;
      }
    }
  }

  public Resize(width: number, height: number) {
    this.composer.setSize(width, height);
    this.effectFXAA.uniforms[ 'resolution' ].value.set( 1 / width, 1 / height );
    // this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
  }

  public Update() {
    this.composer.render();
  }
}