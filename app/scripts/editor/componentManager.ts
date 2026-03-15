import * as THREE from "three";
import BaseComponent from "./components/baseComponent";
import { TransformControls } from "./external/TransformControls.js";
import { OrbitControls } from "./external/OrbitControls.js";

export enum TransformControlMode {
  Translate = "translate",
  Rotate = "rotate",
  Scale = "scale",
  None = "",
}

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

  /** Returns the list of all components in the scene */
  public get Components() {
    return this.components;
  }

  /** Returns the list of all meshes in the scene */
  public get Meshes() {
    return this.meshes;
  }

  public AddComponent = (component: BaseComponent) => {
    this.components.push(component);
    if (component.Mesh) {
      this.meshes.push(component.Mesh);
    }
  }

  public RemoveComponent = (component: BaseComponent) => {
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

    this.controls.detach();
    component.dispose();
  }

  public DisposeAll() {
    for (let i = 0; i < this.components.length; i++) {
      this.components[i].dispose();
    }

    this.components = [];
  }

  public Update = (deltaTime: number) => {
    for (let i = 0; i < this.components.length; i++) {
      this.components[i].update(deltaTime);
    }
  }

  /** Sets current selected component */
  public SetSelectedComponent = (component: BaseComponent | null) => {
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

  /** Sets the amount that translation will snap to (grid size) */
  public SetTranslationSnap(size: number | null): void {
    this.controls.setTranslationSnap(size);
  }

  /** Sets transform control mode (translate, rotate, scale, none) */
  public SetMode = (mode: TransformControlMode) => {
    if (mode === TransformControlMode.None) {
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
          self.SetMode(TransformControlMode.None);
          break;
        case 87: // W
          self.SetMode(TransformControlMode.Translate);
          break;
        case 69: // E
          self.SetMode(TransformControlMode.Rotate);
          break;
        case 82: // R
          self.SetMode(TransformControlMode.Scale);
          break;
      }
    });
  }
}