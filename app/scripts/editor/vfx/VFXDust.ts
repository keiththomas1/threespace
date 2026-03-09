import { VFXProperties, VFXType } from "../../player/utils/playerDefinitions";
import { DustVfxData } from "../../player/utils/vfxInfo";
import VFXComponent from "./VFXComponent";

export default class VFXDust extends VFXComponent {
  protected static DEFAULT_SPEED = 0.1;
  protected static DEFAULT_SIZE = 14;
  protected static DEFAULT_COUNT = 60;

  constructor(vfxProperties: VFXProperties) {
    vfxProperties.type = VFXType.Dust;

    super(vfxProperties, DustVfxData);
  }
}