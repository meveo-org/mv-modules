import { LitElement } from "lit-element";
import { MvStore } from "mv-store";

const getParentStore = (element) => {
  if (element === undefined) {
    return null;
  }

  if (element instanceof DocumentFragment) {
    element = element.host;
  }

  if (element instanceof Element) {
    if (element instanceof MvElement) {
      return element.store;
    } else {
      return getParentStore(element.parentNode);
    }
  } else {
    return null;
  }
};
export class MvElement extends LitElement {
  static get properties() {
    return {
      storageModes: { type: String, attribute: "storage-modes" },
    };
  }

  constructor(config) {
    super();
    this.config = config;
  }

  connectedCallback() {
    const { value: name } = this.attributes["name"] || {};
    const parentStore = getParentStore(this.parentNode);
    this.store = new MvStore(this, name, parentStore);
    super.connectedCallback();
  }
}
