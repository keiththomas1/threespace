import * as THREE from "three";
import { ActionType } from "./utils/playerDefinitions";
import PlayerComponent from "./components/playerComponent";

export default class ActionManager {
  private componentSelected: (eventName: string) => any;
  private moveCameraTo: (matrix: THREE.Matrix4) => any;

  constructor(
    componentSelected: (eventName: string) => any,
    moveCameraTo: (matrix: THREE.Matrix4) => any) {
    this.componentSelected = componentSelected;
    this.moveCameraTo = moveCameraTo;
  }

  public handleAction(component: PlayerComponent) {
    const action = component.ComponentProperties.action;
    if (action !== null) {
      switch (action.actionType) {
        case ActionType.HYPERLINK:
          if (action.hyperlinkURL) {
            window.open(action.hyperlinkURL, '_blank');
          }
          break;
        case ActionType.ZOOM_CAMERA_TO:
          if (action.zoomCameraMatrix && action.zoomCameraMatrix.length > 0) {
            const matrix = new THREE.Matrix4().fromArray(action.zoomCameraMatrix);
            this.moveCameraTo(matrix);
          }
          break;
        case ActionType.TRIGGER_EVENT:
          if (action.eventName) this.componentSelected(action.eventName);
          break;
        case ActionType.NONE:
        default:
          break;
      }
    }
  }
}