import * as THREE from "three";
import BaseComponent from "./components/baseComponent";
import { TransformControls } from "./external/TransformControls.js";
import { OrbitControls } from "./external/OrbitControls.js";

export default class ComponentManager {
  private controls: TransformControls;
  private components: BaseComponent[] = [];
  private meshes: THREE.Object3D[] = [];

  private currentMode: string = "";
  private currentComponent: BaseComponent | null = null;
  private focusComponent: (component: BaseComponent) => any;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    canvas: HTMLElement,
    orbitControls: OrbitControls,
    focusComponent: (component: BaseComponent) => any) {
    this.controls = new TransformControls( camera, canvas );
    this.controls.setScaleSnap(0.1);
    this.controls.addEventListener( 'dragging-changed', function ( event ) {
      orbitControls.enabled = ! event.value;
    } );
    this.controls.renderOrder = 10;
    scene.add(this.controls);

    this.focusComponent = focusComponent;

    this.setupControls();
  }

  public get Components() {
    return this.components;
  }

  public get Meshes() {
    return this.meshes;
  }

  public addComponent = (component: BaseComponent) => {
    this.components.push(component);
    if (component.Mesh) {
      this.meshes.push(component.Mesh);
    }
  }

  public removeComponent = (component: BaseComponent) => {
    for (let i = 0; i < this.meshes.length; i++) {
      if (component.Mesh && component.Mesh === this.meshes[i]) {
        this.meshes.splice(i, 1);
        break;
      }
    }
    for (let c = 0; c < this.components.length; c++) {
      if (component === this.components[c]) {
        this.components.splice(c, 1);
        break;
      }
    }

    component.dispose();
  }

  public disposeAll() {
    for (let i = 0; i < this.components.length; i++) {
      this.components[i].dispose();
    }

    this.components = [];
  }

  public update = (deltaTime: number) => {
    for (let i = 0; i < this.components.length; i++) {
      this.components[i].update(deltaTime);
    }
  }

  public setSelectedComponent = (component: BaseComponent | null) => {
    if (this.currentComponent) this.currentComponent.unselected();

    if (component !== null) {
      component.selected();
      if (this.currentMode !== "") {
        this.controls.attach(component);
      }
    } else {
      this.controls.detach();
    }

    this.currentComponent = component;
  }

  public setMode = (mode: "translate" | "rotate" | "scale" | "") => {
    if (mode === "") {
      this.controls.detach();
    } else {
      if (this.currentComponent) {
        this.controls.attach(this.currentComponent);
      }

      this.controls.setMode( mode );
    }

    this.currentMode = mode;
  }

  private setupControls() {
    const self = this;
    window.addEventListener( 'keydown', function ( event ) {
      switch ( event.keyCode ) {
        case 70: // F
          if (self.currentComponent) {
            self.focusComponent(self.currentComponent);
          }
          break;
        case 81: // Q
          self.setMode("");
          break;
        case 87: // W
          self.setMode("translate");
          break;
        case 69: // E
          self.setMode("rotate");
          break;
        case 82: // R
          self.setMode("scale");
          break;
      }
    });
  }
}