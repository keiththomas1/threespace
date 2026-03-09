import { Component } from "react";
import Image from 'next/image';
import editorStyles from "../pages/editor/EditorPage.module.css";
import styles from "./importToolbarButton.module.css";

export default class ImportToolbarButton extends Component {
  private buttonID: string = "";
  private buttonIcon: string = "";
  private buttonText: string = "";
  private tooltipText: string = "";
  private fileUploadTypes: string = "";
  private onClicked: (() => any) | null = null;
  private onUploaded: ((files: Blob[]) => any) | null = null;
  private onUrlSelected: ((url: string) => any) | null = null;

  private initialized: boolean = false;

  constructor(
    props: {
      buttonID: string, buttonIcon: string, buttonText: string, tooltipText: string, fileUploadTypes: string,
      onClicked: () => any,
      onUploaded: (files: Blob[]) => any,
      onUrlSelected: (url: string) => any }) {
    super(props);

    this.buttonID = props.buttonID;
    this.buttonIcon = props.buttonIcon;
    this.buttonText = props.buttonText;
    this.tooltipText = props.tooltipText;
    this.fileUploadTypes = props.fileUploadTypes;

    this.onClicked = props.onClicked;
    this.onUploaded = props.onUploaded;
    this.onUrlSelected = props.onUrlSelected;
  }

  public componentDidMount() {
    if (!this.initialized) {
      const importToolbarPopout = document.getElementById(this.getUniqueID("importToolbarPopout"));

      const importButton = document.getElementById(this.getUniqueID(styles.importButton));
      if (importButton && this.onUploaded) {
        const importButtonCasted = importButton as any;
        importButton.onchange = () => {
          const files: Blob[] = Array.from(importButtonCasted.files);
          this.onUploaded(files);
        };
      }

      /* URL Button */
      const urlPopupParent = document.getElementById(this.getUniqueID("urlPopupParent"));
      const urlButton = document.getElementById(this.getUniqueID(styles.urlButton));
      if (urlButton && this.onUrlSelected) {
        urlButton.addEventListener("click", () => {
          if (urlPopupParent) urlPopupParent.style.visibility = "visible";
          this.hideToolbarPopout();
        });
      }

      const urlPopupForm = document.getElementById(this.getUniqueID(styles.urlPopupForm));
      if (urlPopupForm) {
        urlPopupForm.addEventListener('submit', (e: SubmitEvent) => {
          e.preventDefault();

          if (urlPopupParent) {
            urlPopupParent.style.visibility = "hidden";
          }

          const urlPopupInput = document.getElementById(this.getUniqueID(styles.urlPopupInput)) as HTMLInputElement;
          if (urlPopupInput && this.onUrlSelected) {
            this.onUrlSelected(urlPopupInput.value);
          }
        });
      }

      const panelButton = document.getElementById(this.buttonID);
      if (panelButton) {
        panelButton.addEventListener("click", () => {
          if (this.onClicked != null) {
            this.onClicked();
          } else if (importToolbarPopout) {
            importToolbarPopout.style.visibility = "visible";
            if (!this.onUrlSelected) urlButton.remove();
            if (!this.onUploaded) importButton.remove();
          }
        });
      }

      this.initialized = true;
    }
  }

  private getUniqueID(elementID: string) {
    return elementID + this.buttonID;
  }

  private importButtonClicked = () => {
    const importButton = document.getElementById(this.getUniqueID(styles.importButton));
    if (importButton) importButton.click();

    this.hideToolbarPopout();
  }

  private hideToolbarPopout() {
    const importToolbarPopout = document.getElementById(this.getUniqueID("importToolbarPopout"));
    if (importToolbarPopout) importToolbarPopout.style.visibility = "hidden";
  }

  render() {
    return(
      <div>
        <button id={this.buttonID} className={styles.importToolbarButton + " " + editorStyles.tooltipButton} >
          <Image
            className={editorStyles.inlineButtonImage} src={this.buttonIcon}
            alt="Image Icon" width={32} height={32}>
          </Image>
          {this.buttonText}
          <span className={editorStyles.tooltip + " " + editorStyles.tooltiptextBottom + " " + editorStyles.secondUIDepth}>
            {this.tooltipText}
          </span>
        </button>

        <div id={this.getUniqueID("importToolbarPopout")} className={styles.importToolbarPopout}>
          <input accept={this.fileUploadTypes} id={this.getUniqueID(styles.importButton)}
            type="file" style={{ display: 'none' }} multiple />
          <label htmlFor={this.getUniqueID(styles.importButton)}>
            <button className={styles.importToolbarPopoutButton + " " + editorStyles.tooltipButton}
              onClick={this.importButtonClicked}>
              Import
            </button>
            <span className={editorStyles.tooltip + " " + editorStyles.tooltiptextBottom + " " + editorStyles.secondUIDepth}>
              Import Local File
            </span>
          </label>
          <button id={this.getUniqueID(styles.urlButton)} className={styles.importToolbarPopoutButton + " " + editorStyles.tooltipButton}>
            URL
          </button>
        </div>

        <div id={this.getUniqueID("urlPopupParent")}
          className={styles.popupParent + " " + editorStyles.modalUIParent + " " + editorStyles.secondUIDepth}>
          <div className={editorStyles.modalUI + " " + editorStyles.thirdUIDepth}>
            <div className={editorStyles.modalUIVerticalLayout}>
              <h3>Link to your Asset</h3>
              <form id={this.getUniqueID(styles.urlPopupForm)}>
                <label htmlFor={this.getUniqueID(styles.urlPopupInput)}>URL</label>
                <input type="text" id={this.getUniqueID(styles.urlPopupInput)}></input>
                <button type='submit'>Import</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }
}