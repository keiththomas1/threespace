
import { Component } from 'react';
import styles from "./wysiwyg.module.css";

import EditorJS, { OutputData } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Quote from '@editorjs/quote';
import SimpleImage from '@editorjs/simple-image';

export default class WYSIWYG extends Component {
  private editor: EditorJS | null = null;
  private initialized: boolean = false;
  private saveCallback: (saveData: OutputData) => {};

  constructor(props: {saveCallback: (_:OutputData) => any}) {
    super(props);

    this.saveCallback = props.saveCallback;
  }

  componentDidUpdate(prevProps: any, prevState: any) {

  }

  componentDidMount() {
    if (!this.initialized) {
      this.editor = new EditorJS({
        holder : styles.editor,
        autofocus: true,
        placeholder: "Enter your text here!",
        // logLevel: LogLevels.WARN,
        // readOnly: true,
        tools: {
            header: {
              class: Header,
              config: {
                levels: [1, 2, 3, 4],
                defaultLevel: 3,
              },
              inlineToolbar : true
            },
            image: {
              class: SimpleImage,
              inlineToolbar : true
            },
            list: {
              class: List,
              inlineToolbar: true,
            },
            quote: {
              class: Quote,
              inlineToolbar: true,
              config: {
                quotePlaceholder: 'Enter a quote',
                captionPlaceholder: 'Quote\'s author',
              },
            },
        },

        // data:{ }
        // onReady: function() {
        //   console.log("Ready");
        // },
        // onChange: function(api, event) {
        //   console.log('something changed', event);
        // }
      });

      const saveButton = document.getElementById(styles.saveButton);
      if (saveButton) {
        saveButton.addEventListener("click", () => {
          if (this.editor) {
            this.editor.save().then(this.saveCallback);
          }
        })
      }

      const editorPopupParent = document.getElementById(styles.editorPopupParent);
      const backButton = document.getElementById(styles.backButton);
      if (backButton) {
        backButton.addEventListener("click", () => {
          if (editorPopupParent) editorPopupParent.style.visibility = "hidden";
        });
      }

      this.initialized = true;
    }
  }

  render() {
    return (
      <div id={styles.editorPopupParent}>
        <div id={styles.editorPopup}>
          <h2 id={styles.editorHeader}>Text Editor</h2>
          <button id={styles.backButton}>Back</button>
          <button id={styles.saveButton}>Save</button>
          <div id={styles.editor}>
          </div>
        </div>
      </div>
    );
  }
}