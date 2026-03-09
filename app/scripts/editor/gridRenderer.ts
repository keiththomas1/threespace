import * as THREE from "three";

export default class GridRenderer {
  private gridHelperFloor: THREE.Group;

  constructor() {
    this.gridHelperFloor = new THREE.Group();
  }

  public setupGrid(roomGroup: THREE.Group) {
    const GRID_COLOR = new THREE.Color(0, 140/255, 90/255);

    const gridHelperFloor = new THREE.GridHelper( 30, 30, GRID_COLOR, GRID_COLOR );
    this.gridHelperFloor.add(gridHelperFloor);
    roomGroup.add( this.gridHelperFloor );
  }

  public setGridEnabled = (enabled: boolean) => {
    this.gridHelperFloor.visible = enabled;
  }
}