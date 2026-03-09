import { Component } from "react";
import styles from "./visualCarousel.module.css";
import { VisualCarouselData } from "./visualCarousel";

interface VisualCarouselItemProps {
  visualCarouselData: VisualCarouselData;
  onSelected: (value: string) => void;
}

export default class VisualCarouselItem extends Component<VisualCarouselItemProps> {
  private handleClick = () => {
    this.props.onSelected(this.props.visualCarouselData.value);
  }

  render() {
    return (
      <div className={styles.visualCarouselItem}>
        <img
          className={styles.visualCarouselItemImage}
          src={this.props.visualCarouselData.thumbnailURL}
          alt={this.props.visualCarouselData.tooltip}
          width={160} height={90}
          onClick={this.handleClick}></img>
      </div>
    );
  }
}