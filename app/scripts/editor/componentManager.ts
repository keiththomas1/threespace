import * as THREE from "three";
import BaseComponent from "./components/baseComponent";
import { TransformControls } from "./external/TransformControls.js";
import { OrbitControls } from "./external/OrbitControls.js";
import { UndoManager, TransformChangedCommand } from "./undoManager";

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
  private undoManager: UndoManager;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    canvas: HTMLElement,
    orbitControls: OrbitControls,
    focusComponent: (component: BaseComponent) => any,
    undoManager: UndoManager) {
    this.controls = new TransformControls( camera, canvas );
    this.controls.setScaleSnap(0.1);
    this.undoManager = undoManager;

    let matrixBefore: number[] | null = null;
    this.controls.addEventListener('dragging-changed', (event: any) => {
      orbitControls.enabled = !event.value;
      if (event.value) {
        if (this.currentComponent) {
          this.currentComponent.updateMatrix();
          matrixBefore = Array.from(this.currentComponent.matrix.elements);
        }
      } else {
        if (this.currentComponent && matrixBefore) {
          this.currentComponent.updateMatrix();
          const matrixAfter = Array.from(this.currentComponent.matrix.elements);
          this.undoManager.execute(
            new TransformChangedCommand(this.currentComponent, matrixBefore, matrixAfter)
          );
          matrixBefore = null;
        }
      }
    });
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

  /** Returns the currently selected component */
  public get CurrentComponent(): BaseComponent | null {
    return this.currentComponent;
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

  /** Removes a component from the scene without disposing it (used for undo/redo) */
  public RemoveComponentFromScene = (component: BaseComponent) => {
    this.meshes = this.meshes.filter(m => m !== component.Mesh);
    this.components = this.components.filter(c => c !== component);
    if (this.currentComponent === component) {
      this.currentComponent = null;
      this.controls.detach();
    }
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
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z') { event.preventDefault(); this.undoManager.undo(); return; }
        if (event.key === 'y') { event.preventDefault(); this.undoManager.redo(); return; }
      }

      switch (event.key) {
        case 'f': case 'F': if (this.currentComponent) this.focusComponent(this.currentComponent); break;
        case 'q': case 'Q': this.SetMode(TransformControlMode.None); break;
        case 'w': case 'W': this.SetMode(TransformControlMode.Translate); break;
        case 'e': case 'E': this.SetMode(TransformControlMode.Rotate); break;
        case 'r': case 'R': this.SetMode(TransformControlMode.Scale); break;
      }
    });
  }
}
