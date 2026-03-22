import * as THREE from "three";
import BaseComponent from "./components/baseComponent";

interface IComponentManagerCommands {
  AddComponent(component: BaseComponent): void;
  RemoveComponentFromScene(component: BaseComponent): void;
}

export interface ICommand {
  execute(): void;
  undo(): void;
}

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

  execute(): void {
    this.component.PropertyChanged(this.propertyName, this.newProperty);
  }

  undo(): void {
    this.component.PropertyChanged(this.propertyName, this.oldProperty);
  }
}

export class TransformChangedCommand implements ICommand {
  private component: BaseComponent;
  private matrixBefore: number[];
  private matrixAfter: number[];

  constructor(component: BaseComponent, matrixBefore: number[], matrixAfter: number[]) {
    this.component = component;
    this.matrixBefore = matrixBefore;
    this.matrixAfter = matrixAfter;
  }

  execute(): void {
    this.applyMatrix(this.matrixAfter);
  }

  undo(): void {
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

export class AddComponentCommand implements ICommand {
  private component: BaseComponent;
  private roomGroup: THREE.Group;
  private componentManager: IComponentManagerCommands;
  private selectCallback: () => void;

  constructor(
    component: BaseComponent,
    roomGroup: THREE.Group,
    componentManager: IComponentManagerCommands,
    selectCallback: () => void
  ) {
    this.component = component;
    this.roomGroup = roomGroup;
    this.componentManager = componentManager;
    this.selectCallback = selectCallback;
  }

  execute(): void {
    this.roomGroup.add(this.component);
    this.componentManager.AddComponent(this.component);
    this.selectCallback();
  }

  undo(): void {
    this.componentManager.RemoveComponentFromScene(this.component);
    this.roomGroup.remove(this.component);
  }
}

export class RemoveComponentCommand implements ICommand {
  private component: BaseComponent;
  private roomGroup: THREE.Group;
  private componentManager: IComponentManagerCommands;
  private undoCallback: () => void;

  constructor(
    component: BaseComponent,
    roomGroup: THREE.Group,
    componentManager: IComponentManagerCommands,
    undoCallback: () => void = () => {}
  ) {
    this.component = component;
    this.roomGroup = roomGroup;
    this.componentManager = componentManager;
    this.undoCallback = undoCallback;
  }

  execute(): void {
    this.componentManager.RemoveComponentFromScene(this.component);
    this.roomGroup.remove(this.component);
  }

  undo(): void {
    this.roomGroup.add(this.component);
    this.componentManager.AddComponent(this.component);
    this.undoCallback();
  }

  public disposeComponent(): void {
    this.component.dispose();
  }
}

export class UndoManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  readonly maxSize: number;
  private onChanged?: () => void;

  constructor(maxSize = 25, onChanged?: () => void) {
    this.maxSize = maxSize;
    this.onChanged = onChanged;
  }

  execute(command: ICommand): void {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxSize) {
      const evicted = this.undoStack.shift();
      if (evicted instanceof RemoveComponentCommand) evicted.disposeComponent();
    }
    this.redoStack = [];
  }

  undo(): void {
    const cmd = this.undoStack.pop();
    if (cmd) {
      cmd.undo();
      this.redoStack.push(cmd);
      this.onChanged?.();
    }
  }

  redo(): void {
    const cmd = this.redoStack.pop();
    if (cmd) {
      cmd.execute();
      this.undoStack.push(cmd);
      this.onChanged?.();
    }
  }

  clear(): void {
    [...this.undoStack, ...this.redoStack]
      .forEach(c => { if (c instanceof RemoveComponentCommand) c.disposeComponent(); });
    this.undoStack = [];
    this.redoStack = [];
  }
}
