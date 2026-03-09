import { Component } from "react";
import styles from "./visualCarousel.module.css";
import { VisualCarouselData } from "./visualCarousel";
import { v4 as uuidv4 } from "uuid";

interface VisualCarouselItemProps {
  visualCarouselData: VisualCarouselData;
  onSelected: (value: string) => void;
}

export default class VisualCarouselItem extends Component<VisualCarouselItemProps> {
  private currentData: VisualCarouselData = null;
  private onSelected: ((value: string) => any) | null = null;
  private initialized: boolean = false;
  private uniqueID: string;

  constructor(
    props: VisualCarouselItemProps) {
    super(props);

    this.currentData = props.visualCarouselData;
    this.onSelected = props.onSelected;
    this.uniqueID = uuidv4();
  }

  public componentDidMount() {
    if (!this.initialized) {
      this.initialized = true;

      const image = document.getElementById(styles.visualCarouselItemImage + this.uniqueID);
      if (image) {
        image.addEventListener("click", this.handleClick);
      }
    }
  }

  private handleClick = (event) => {
    this.onSelected(this.currentData.value);
  }

  render() {
    return (
      <div className={styles.visualCarouselItem}>
        <img
          id={styles.visualCarouselItemImage + this.uniqueID}
          src={this.currentData.thumbnailURL}
          alt={this.currentData.tooltip}
          width={160} height={90}></img>
      </div>
    );
  }
}