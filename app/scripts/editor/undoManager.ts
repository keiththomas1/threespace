import * as THREE from "three";
import BaseComponent from "./components/baseComponent";
import ComponentManager from "./componentManager";

/**
 * Implements the Command pattern for undo/redo functionality in the editor. Each command encapsulates an action (e.g. property change, transform change, component addition/removal) 
 * and knows how to execute and undo that action. 
 */
export interface ICommand {
  Execute(): void;
  Undo(): void;
}

/** 
 * Command for property changes on components. Stores the component, property name, old value, and new value. On execute, applies the new value; on undo, reverts to the old value.
 */
export class PropertyChangedCommand implements ICommand {
  private component: BaseComponent;
  private propertyName: string;
  private oldProperty: any;
  private newProperty: any;

  constructor(component: BaseComponent, propertyName: string, oldProperty: any, newProperty: any) {
    this.component = component;
    this.propertyName = propertyName;
    this.oldProperty = oldProperty;
    this.newProperty = newProperty;
  }

  public Execute(): void {
    this.component.PropertyChanged(this.propertyName, this.newProperty);
  }

  public Undo(): void {
    this.component.PropertyChanged(this.propertyName, this.oldProperty);
  }
}

/**
 * Command for transform changes on components. Stores the component, its matrix before the change, and its matrix after the change. 
 * On execute, applies the after matrix; on undo, reverts to the before matrix.
 */
export class TransformChangedCommand implements ICommand {
  private component: BaseComponent;
  private matrixBefore: number[];
  private matrixAfter: number[];

  constructor(component: BaseComponent, matrixBefore: number[], matrixAfter: number[]) {
    this.component = component;
    this.matrixBefore = matrixBefore;
    this.matrixAfter = matrixAfter;
  }

  public Execute(): void {
    this.applyMatrix(this.matrixAfter);
  }

  public Undo(): void {
    this.applyMatrix(this.matrixBefore);
  }

  private applyMatrix(matrixArray: number[]): void {
    const m = new THREE.Matrix4().fromArray(matrixArray);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    m.decompose(pos, quat, scale);
    this.component.position.copy(pos);
    this.component.quaternion.copy(quat);
    this.component.scale.copy(scale);
  }
}

/**
 * Command for adding a component to the scene. Stores the component, the room group to which it is added, the component manager, and a callback to select the component after adding. 
 * On execute, adds the component to the scene and selects it; on undo, removes the component from the scene.
 */
export class AddComponentCommand implements ICommand {
  private component: BaseComponent;
  private roomGroup: THREE.Group;
  private componentManager: ComponentManager;
  private selectCallback: () => void;

  constructor(
    component: BaseComponent,
    roomGroup: THREE.Group,
    componentManager: ComponentManager,
    selectCallback: () => void
  ) {
    this.component = component;
    this.roomGroup = roomGroup;
    this.componentManager = componentManager;
    this.selectCallback = selectCallback;
  }

  public Execute(): void {
    this.roomGroup.add(this.component);
    this.componentManager.AddComponent(this.component);
    this.selectCallback();
  }

  public Undo(): void {
    this.componentManager.RemoveComponentFromScene(this.component);
    this.roomGroup.remove(this.component);
  }
}

/**
 * Command for removing a component from the scene. Stores the component, the room group from which it is removed, the component manager, and a callback to select the component after undoing. 
 * On execute, removes the component from the scene; on undo, adds the component back to the scene and selects it. Also includes a method to dispose of the component when it is evicted from the undo stack.
 */
export class RemoveComponentCommand implements ICommand {
  private component: BaseComponent;
  private roomGroup: THREE.Group;
  private componentManager: ComponentManager;
  private undoCallback: () => void;

  constructor(
    component: BaseComponent,
    roomGroup: THREE.Group,
    componentManager: ComponentManager,
    undoCallback: () => void = () => {}
  ) {
    this.component = component;
    this.roomGroup = roomGroup;
    this.componentManager = componentManager;
    this.undoCallback = undoCallback;
  }

  public Execute(): void {
    this.componentManager.RemoveComponentFromScene(this.component);
    this.roomGroup.remove(this.component);
  }

  public Undo(): void {
    this.roomGroup.add(this.component);
    this.componentManager.AddComponent(this.component);
    this.undoCallback();
  }

  public DisposeComponent(): void {
    this.component.dispose();
  }
}

/**
 * Manages the undo and redo stacks for the editor. Provides methods to execute a command, undo the last command, redo the last undone command, and clear the history.
 */
export class UndoManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  readonly maxSize: number;
  private onChanged?: () => void;

  private readonly MAX_SIZE = 25;

  constructor(onChanged?: () => void) {
    this.maxSize = this.MAX_SIZE;
    this.onChanged = onChanged;
  }

  public Execute(command: ICommand): void {
    command.Execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxSize) {
      const evicted = this.undoStack.shift();
      if (evicted instanceof RemoveComponentCommand) evicted.DisposeComponent();
    }
    this.redoStack = [];
  }

  public Undo(): void {
    const cmd = this.undoStack.pop();
    if (cmd) {
      cmd.Undo();
      this.redoStack.push(cmd);
      this.onChanged?.();
    }
  }

  public Redo(): void {
    const cmd = this.redoStack.pop();
    if (cmd) {
      cmd.Execute();
      this.undoStack.push(cmd);
      this.onChanged?.();
    }
  }

  public Clear(): void {
    [...this.undoStack, ...this.redoStack]
      .forEach(c => { if (c instanceof RemoveComponentCommand) c.DisposeComponent(); });
    this.undoStack = [];
    this.redoStack = [];
  }
}
