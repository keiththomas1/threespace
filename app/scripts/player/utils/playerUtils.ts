import * as THREE from "three";
import { Object3D } from "three";
import { SerializableColor, SerializableVector3 } from "./playerDefinitions";

export default class PlayerUtils {
  public static getColorFromSerializableColor(color: SerializableColor) : THREE.Color {
    return new THREE.Color(color.r, color.g, color.b);
  }
  public static getSerializableColorFromColor(color: THREE.Color) : SerializableColor {
    return {r: color.r, g: color.g, b: color.b};
  }
  public static getVector3FromSerializableVector3(vector: SerializableVector3) : THREE.Vector3 {
    return new THREE.Vector3(vector.x, vector.y, vector.z);
  }

  public static isMobile(navigator: any) {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  public static createHitBoxForObject3D = (object3D: THREE.Object3D) => {
    const largeBox = new THREE.Box3();
    const material = new THREE.MeshBasicMaterial( { color:0xFF0, transparent: true, opacity: 0 } );
    const hitboxGroup = new THREE.Group();
    hitboxGroup.name = "HitboxGroup";

    const meshes: THREE.Mesh[] = [];
    PlayerUtils.getGltfMeshes(object3D, meshes);
    for (let i = 0; i < meshes.length; i++) {
      meshes[i].geometry.computeBoundingBox();

      const box = new THREE.Box3();
      const boundingBox = meshes[i].geometry.boundingBox;
      if (boundingBox) {
        box.copy( boundingBox ).applyMatrix4( meshes[i].matrixWorld );
      }

      const geometry = new THREE.BoxGeometry(
        box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z );
      const hitbox = new THREE.Mesh( geometry, material );
      hitboxGroup.add( hitbox );
      hitbox.quaternion.copy(new THREE.Quaternion());

      largeBox.union(box);
    }

    hitboxGroup.position.set(
      (largeBox.max.x - largeBox.min.x) / 2,
      (largeBox.max.y - largeBox.min.y) / 2,
      (largeBox.max.z - largeBox.min.z) / 2,);

    return hitboxGroup;
  }

  /**
   * Recursively finds all meshes within a GLTF parent.
   */
  static getGltfMeshes(object3D: Object3D, meshes: THREE.Mesh[]) {
    if (object3D instanceof THREE.Mesh) {
      meshes.push(object3D);
    }

    for (let i = 0; i < object3D.children.length; i++) {
      PlayerUtils.getGltfMeshes(object3D.children[i], meshes);
    }
  }
}