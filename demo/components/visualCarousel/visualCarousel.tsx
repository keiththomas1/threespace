import styles from "./visualCarousel.module.css";
import VisualCarouselItem from "./visualCarouselItem";
import Image from 'next/image';
import { useState } from 'react';
import { PlayerProperties } from 'threespace';

import HomeJSON from '../../public/scenes/Home/Home.json';
import HomeThumb from '../../public/scenes/Home/Home.jpg';
import LabJSON from '../../public/scenes/Lab/Lab.json';
import LabThumb from '../../public/scenes/Lab/Lab.jpg';
import RainyHutJSON from '../../public/scenes/RainyHut/RainyHut.json';
import RainyHutThumb from '../../public/scenes/RainyHut/RainyHut.jpg';
import WinterWarmthJSON from '../../public/scenes/WinterWarmth/WinterWarmth.json';
import WinterWarmthThumb from '../../public/scenes/WinterWarmth/WinterWarmth.jpg';
import UnderwaterJSON from '../../public/scenes/Underwater/Underwater.json';
import UnderwaterThumb from '../../public/scenes/Underwater/Underwater.jpg';
import MoonLanderJSON from '../../public/scenes/MoonLander/MoonLander.json';
import MoonLanderThumb from '../../public/scenes/MoonLander/MoonLander.jpg';

export interface VisualCarouselData {
  path: string,
  thumbnailURL: string,
  tooltip: string,
  value: string
}

interface SceneEntry {
  data: VisualCarouselData;
  properties: PlayerProperties;
}

const SCENES: SceneEntry[] = [
  {
    data: { thumbnailURL: HomeThumb.src, path: '/scenes/Home', tooltip: 'Home Page', value: 'Home' },
    properties: HomeJSON as PlayerProperties,
  },
  {
    data: { thumbnailURL: LabThumb.src, path: '/scenes/Lab', tooltip: 'Lab', value: 'Lab' },
    properties: LabJSON as PlayerProperties,
  },
  {
    data: { thumbnailURL: RainyHutThumb.src, path: '/scenes/RainyHut', tooltip: 'Rainy Hut', value: 'RainyHut' },
    properties: RainyHutJSON as PlayerProperties,
  },
  {
    data: { thumbnailURL: WinterWarmthThumb.src, path: '/scenes/WinterWarmth', tooltip: 'Winter Warmth', value: 'WinterWarmth' },
    properties: WinterWarmthJSON as PlayerProperties,
  },
  {
    data: { thumbnailURL: UnderwaterThumb.src, path: '/scenes/Underwater', tooltip: 'Underwater', value: 'Underwater' },
    properties: UnderwaterJSON as PlayerProperties,
  },
  {
    data: { thumbnailURL: MoonLanderThumb.src, path: '/scenes/MoonLander', tooltip: 'Moon Lander', value: 'MoonLander' },
    properties: MoonLanderJSON as PlayerProperties,
  },
];

export function VisualCarousel({ onSceneSelected }: { onSceneSelected: (path: string, properties: PlayerProperties) => void }) {
  const [isOpen, setIsOpen] = useState(true);

  function handleItemSelected(value: string) {
    const scene = SCENES.find(s => s.data.value === value);
    if (scene) onSceneSelected(scene.data.path, scene.properties);
  }

  function navigateLeft() {}
  function navigateRight() {}

  if (!isOpen) {
    return (
      <button className={styles.demoScenesButton} onClick={() => setIsOpen(true)}>
        Demo Scenes
      </button>
    );
  }

  return (
    <div id={styles.visualCarousel}>
      <Image
        id={styles.visualCarouselLeftButton}
        src="/images/48x/Icon_238.png" alt="Previous item"
        width={48} height={48}
        onClick={navigateLeft}>
      </Image>
      <div className={styles.imageGallery}>
        {SCENES.map(scene => (
          <div key={scene.data.value} className={styles.sceneOption}>
            <VisualCarouselItem visualCarouselData={scene.data} onSelected={handleItemSelected} />
            <span className={styles.sceneLabel}>{scene.data.tooltip}</span>
          </div>
        ))}
      </div>
      <button>
        <Image
          id={styles.visualCarouselRightButton}
          src="/images/48x/Icon_237.png" alt="Next item"
          width={48} height={48}
          onClick={navigateRight}>
        </Image>
      </button>
      <button className={styles.exitButton} onClick={() => setIsOpen(false)}>
        ✕
      </button>
    </div>
  );
}