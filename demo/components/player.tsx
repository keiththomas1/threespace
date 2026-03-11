import { Component } from "react";
import Image from 'next/image';
import { ThreeSpacePlayer } from "threespace";
import styles from '../styles/Player.module.css';

export default class Player extends Component {
  private player: ThreeSpacePlayer | null = null;
  private playerComponentSelected: () => {};

  private creditSection: HTMLElement | null = null;
  private creditPieceName: HTMLElement | null = null;
  private creditAuthorName: HTMLElement | null = null;
  private creditSiteName: HTMLElement | null = null;
  private creditLicenseName: HTMLElement | null = null;

  constructor(props: any) {
    super(props);

    this.playerComponentSelected = props.playerComponentSelected;
  }

  componentDidMount() {
    this.creditSection = document.getElementById(styles.referenceSection);
    this.creditPieceName = document.getElementById(styles.referencePieceName);
    this.creditAuthorName = document.getElementById(styles.referenceAuthorName);
    this.creditSiteName = document.getElementById(styles.referenceSiteName);
    this.creditLicenseName = document.getElementById(styles.referenceLicenseName);

    this.setupPlayer();
  }

  componentDidUpdate(prevProps: any, prevState: any) {
    if (prevProps.playerSettings !== this.props.playerSettings && this.player) {
      this.player.Dispose();
      this.player = null;
    }
    this.setupPlayer();
  }

  setupPlayer() {
    const playerSettings = this.props["playerSettings"];
    if (this.player === null && playerSettings && document) {
      const playerParent = document.getElementById(styles.playerParent);
      if (playerParent) {
        this.player = new ThreeSpacePlayer(playerParent, playerSettings, null, process.env.NEXT_PUBLIC_BASE_PATH ?? '');
        this.player.OnSceneLoaded = this.sceneLoaded;
        this.player.OnComponentSelected = this.playerComponentSelected;
      }
    }
  }

  sceneLoaded = () => {
    this.forceUpdate();
  }

  setCreditInfo = (pieceName: string, artistName: string, siteName: string, licenseName: string) => {
    if (pieceName === "" || artistName === "" || siteName === "") {
      this.creditSection.style.visibility = "hidden";
    } else {
      this.creditSection.style.visibility = "visible";

      this.creditPieceName.innerHTML = pieceName;
      this.creditAuthorName.innerHTML = artistName;
      this.creditSiteName.innerHTML = siteName;
      this.creditLicenseName.innerHTML = licenseName;
    }
  }

  muted = () => {
    const muteButton = document.getElementById(styles.muteButton);
    const unmuteButton = document.getElementById(styles.unmuteButton);
    if (muteButton) {
      muteButton.style.visibility = "hidden";
    }
    if (unmuteButton) {
      unmuteButton.style.visibility = "visible";
    }

    this.player.Muted = true;
  }

  unmuted = () => {
    const muteButton = document.getElementById(styles.muteButton);
    const unmuteButton = document.getElementById(styles.unmuteButton);
    if (muteButton) {
      muteButton.style.visibility = "visible";
    }
    if (unmuteButton) {
      unmuteButton.style.visibility = "hidden";
    }

    this.player.Muted = false;
  }

  render() {
    return (
      <div id={styles.playerParent}>
        <button id={styles.muteButton} onClick={this.muted} className={styles.tooltipButton} >
          <Image src="/images/32x/icon_31.png" alt="Mute" width={16} height={16}></Image>
        </button>
        <button id={styles.unmuteButton} onClick={this.unmuted} className={styles.tooltipButton} >
          <Image src="/images/32x/icon_27.png" alt="Un-mute" width={16} height={16}></Image>
        </button>
        <div id={styles.referenceSection}>
          <p id={styles.referencePieceName} className={styles.referenceLine}></p>
          <p id={styles.referenceAuthorName} className={styles.referenceLine}></p>
          <p id={styles.referenceSiteName} className={styles.referenceLine}></p>
          <p id={styles.referenceLicenseName} className={styles.referenceLine}></p>
        </div>
      </div>
    );
  }

}