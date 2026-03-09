import * as THREE from "three";
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js';

export default class ThreeUtilities {
  static deserializeVector3(vector: number[]) {
    if (!ThreeUtilities.checkVectorArray(vector, 3)) {
      return new THREE.Color(0, 0, 0);
    }

    return new THREE.Vector3(vector[0], vector[1], vector[2]);
  }

  static deserializeColor(colorArray: number[]) {
    if (!ThreeUtilities.checkVectorArray(colorArray, 3)) {
      return new THREE.Color(0, 0, 0);
    }

    return new THREE.Color(colorArray[0] / 255, colorArray[1] / 255, colorArray[2] / 255);
  }

  static checkVectorArray(array: any[], expectedLength: number) {
    if (!Array.isArray(array)) {
      console.warn("Trying to deserialize vector that isn't an array: " + array);
      return false;
    }
    if (array.length !== expectedLength) {
      console.warn("Trying to deserialize vector with unexpected length: " + array.length);
      return false
    }

    return true;
  }

  static isIOS(navigator: any) {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

 //orientation of phone screen?
 static isPortrait() {
    var portrait = false;
    if (window.matchMedia("(orientation: portrait)").matches) {
        portrait = true;
    }
    if (window.matchMedia("(orientation: landscape)").matches) {
        portrait = false;
    }
    return portrait;
  }

  static getPath(root: any, folder: any) {
    // TODO: Use a path library to be more reliable
    return root + folder;
  }

  static calculateNormalsOnAllGeometries(object3D: any) {
    if (!object3D) return;
    if (object3D.geometry) {
      object3D.geometry.computeVertexNormals();
      object3D.geometry.computeFaceNormals();
    }
    if (!object3D.children) return;
    for (let i = 0; i < object3D.children.length; i++) {
      ThreeUtilities.calculateNormalsOnAllGeometries(object3D.children[i]);
    }
  }

  static disposeAllChildren(object3D: any, materialsAlso: boolean) {
    if (!object3D) return;
    if (object3D.geometry) {
      object3D.geometry.dispose();
      //object3D.geometry = undefined;
    }

    if (object3D.material && materialsAlso) {
      if (Array.isArray(object3D.material)) {
        for (let j = 0; j < object3D.material.length; j++) {
          object3D.material[j].dispose();
          //object3D.material[j] = undefined;
        }
      } else {
        object3D.material.dispose();
        //object3D.material = undefined;
      }
    }

    if (!object3D.children) return;
    for (let i = 0; i < object3D.children.length; i++) {
      ThreeUtilities.disposeAllChildren(object3D.children[i], materialsAlso);
    }
  }

  static setupNormalHelperOnObjectAndChildren(object3D: any, parent: any) {
    if (object3D.geometry) {
      const helper = new VertexNormalsHelper( object3D, 10, 0x000000/*0x00ff00*/ );
      parent.add( helper );
    }
    if (!object3D.children) {
      return;
    }
    for (let i = 0; i < object3D.children.length; i++) {
      ThreeUtilities.setupNormalHelperOnObjectAndChildren(object3D.children[i], parent);
    }
  }

  static setLayerOnObjectAndChildren(object3D: any, layer: any) {
    if (object3D.geometry) {
      object3D.layers.enable(layer);
    }
    if (!object3D.children) {
      return;
    }
    for (let i = 0; i < object3D.children.length; i++) {
      ThreeUtilities.setLayerOnObjectAndChildren(object3D.children[i], layer);
    }
  }

  static getMaterialsFromGLTF(object3D: any, materials: any) {
    if (object3D.material) {
      materials.push(object3D.material);
    }
    if (!object3D.children) {
      return;
    }
    for (let i = 0; i < object3D.children.length; i++) {
      ThreeUtilities.getMaterialsFromGLTF(object3D.children[i], materials);
    }
  }

  /**
   * Recursively set all child meshes to cast and receive shadows.
   */
  static makeChildrenReceiveAndCastShadow(object3D: any, receiveShadow = true) {
    if (object3D.material) {
      object3D.castShadow = true;
      object3D.receiveShadow = receiveShadow;
    }

    for (let i = 0; i < object3D.children.length; i++) {
      ThreeUtilities.makeChildrenReceiveAndCastShadow(object3D.children[i], receiveShadow);
    }
  }

  static setOpacityOnAllChildMaterials(object3D: any, opacity: any) {
    if (object3D.material) {
      object3D.opacity = opacity;
    }
    if (!object3D.children) {
      return;
    }
    for (let i = 0; i < object3D.children.length; i++) {
      ThreeUtilities.setOpacityOnAllChildMaterials(object3D.children[i], opacity);
    }
  }

  static updateEnvMapOnAllChildMaterials(object3D: any, envMap: any) {
    if (object3D.material) {
      object3D.material.roughness = 0;
      object3D.material.envMap = envMap;
    }
    if (!object3D.children) {
      return;
    }
    for (let i = 0; i < object3D.children.length; i++) {
      ThreeUtilities.updateEnvMapOnAllChildMaterials(object3D.children[i], envMap);
    }
  }

  static setMaterialOnAllChildren(object3D: any, material: any) {
    if (object3D.material) {
      object3D.material = material;
    }
    if (!object3D.children) {
      return;
    }
    for (let i = 0; i < object3D.children.length; i++) {
      ThreeUtilities.setMaterialOnAllChildren(object3D.children[i], material);
    }
  }

  static replaceAllMaterialsWithNewTexture(object3D: any, texture: any) {
    if (object3D.material) {
      object3D.material.map = texture;
    }
    if (!object3D.children) {
      return;
    }
    for (let i = 0; i < object3D.children.length; i++) {
      ThreeUtilities.replaceAllMaterialsWithNewTexture(object3D.children[i], texture);
    }
  }

  static setBasicMaterialOnGLTF(object3D: any, color: THREE.Color = new THREE.Color("white")) {
    if (!object3D) {
      return;
    }
    if (object3D.material) {
      if (Array.isArray(object3D.material)) {
        for (let m = 0; m < object3D.material.length; m++) {
          const mat = ThreeUtilities.setupBasicMaterial(object3D.material[m]);
          mat.color = color;
          object3D.material[m] = mat;
          //console.log(mat);
        }
      } else {
        const mat = ThreeUtilities.setupBasicMaterial(object3D.material);
        mat.color = color;
        object3D.material = mat;
        //console.log(mat);
      }
    }
    if (!object3D.children) {
      return;
    }
    for (let i = 0; i < object3D.children.length; i++) {
      ThreeUtilities.setBasicMaterialOnGLTF(object3D.children[i], color);
    }
  }

  static setupBasicMaterial(originalMaterial: any) {
    const map = originalMaterial.map ?? null;
    const newMaterial = new THREE.MeshBasicMaterial( { map: map } );
    // Object.assign(newMaterial, originalMaterial);
    if (newMaterial.map) newMaterial.map.encoding = THREE.sRGBEncoding;
    // newMaterial.transparent = true;
    return newMaterial;
  }

  /**
   * Converts JSON transform data into THREE transform data.
   */
  static getTransformFromObjData(objData: any) {
    const position = new THREE.Vector3(0, 0, 0);
    const scale = new THREE.Vector3(1, 1, 1);
    let rotation = null;
    let direction = null;

    if (objData.scale) {
      scale.x = objData.scale.x;
      scale.y = objData.scale.y;
      scale.z = objData.scale.z;
    }

    if (objData.position) {
      position.x = objData.position.x;
      position.y = objData.position.y;
      position.z = objData.position.z;
    }

    if (objData.rotation) {
      rotation = new THREE.Vector3(
        objData.rotation.x / 180 * Math.PI,
        objData.rotation.y / 180 * Math.PI,
        objData.rotation.z / 180 * Math.PI);
    } else if (objData.direction) {
      direction = new THREE.Vector3(objData.direction.x, objData.direction.y, objData.direction.z)
    } else {
      rotation = new THREE.Vector3(0, 0, 0);
    }

    return { scale: scale, position: position, rotation: rotation, direction: direction };
  }

  static getScreenPositionFromObjectPosition(
    object3D: any, renderer: any, camera: any, offset = new THREE.Vector3(0, 0, 0))
  {
    if (camera === null) {
      // Return a position off-screen.
      return new THREE.Vector2(-2000, -2000);
    }

    // TODO: Try to make this method without allocating two vector3's since we'll be doing this in an update loop.
    // Maybe just pass in the two vectors (as well as the return one).
    const vector = new THREE.Vector3();
    const renderSize = new THREE.Vector3();
    renderer.getSize(renderSize);
    renderSize.x *= 0.5;
    renderSize.y *= 0.5;

    object3D.updateMatrixWorld();

    vector.setFromMatrixPosition(object3D.matrixWorld);
    vector.add(offset);
    if (!vector.equals(camera.position)) {
      vector.project(camera);
    }

    vector.x = ( vector.x * renderSize.x ) + renderSize.x;
    vector.y = - ( vector.y * renderSize.y ) + renderSize.y;

    return new THREE.Vector2(vector.x, vector.y);
  }

  static isVideoTexture(textureSrc: string) {
    return (textureSrc.endsWith(".mp4") || textureSrc.endsWith(".mov") || textureSrc.endsWith(".wmv")
      || textureSrc.endsWith(".flv") || textureSrc.endsWith(".avi") || textureSrc.endsWith(".webm"));
  }
}