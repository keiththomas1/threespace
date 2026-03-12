import * as THREE from "three";
import { VFXProperties, VFXType } from "../../player/utils/playerDefinitions";
import { RainVfxData } from "../../player/utils/vfxInfo";
import VFXComponent from "./vfxComponent";

export default class VFXRain extends VFXComponent {
  protected static DEFAULT_SPEED = 1;
  protected static DEFAULT_SIZE = 10;
  protected static DEFAULT_COUNT = 100;
  protected static DEFAULT_LIFETIME_MIN = 1.5;
  protected static DEFAULT_LIFETIME_MAX = 2.5;
  protected static DEFAULT_COLOR = new THREE.Color(0x51ffeb);

  constructor(vfxProperties: VFXProperties) {
    vfxProperties.type = VFXType.Rain;

    super(vfxProperties, RainVfxData);
  }
}