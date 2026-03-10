import { VFXProperties, VFXType } from "../../player/utils/playerDefinitions";
import { SnowVfxData } from "../../player/utils/vfxInfo";
import VFXComponent from "./VFXComponent";

export default class VFXSnow extends VFXComponent {
  protected static DEFAULT_SPEED = 1;
  protected static DEFAULT_SIZE = 25;
  protected static DEFAULT_COUNT = 70;
  protected static DEFAULT_LIFETIME_MIN = 7;
  protected static DEFAULT_LIFETIME_MAX = 9;

  constructor(vfxProperties: VFXProperties, assetPath: string = "") {
    vfxProperties.type = VFXType.Snow;

    super(vfxProperties, SnowVfxData, assetPath);
  }
}