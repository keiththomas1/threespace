import * as THREE from "three";

/** Base class for shared VFX functionality */
export default class VFXBaseObject extends THREE.Object3D {
  constructor() {
    super();
  }

  public Update(deltaTime: number) {
    console.warn("Update method not implemented for this VFX object.");
  }
}