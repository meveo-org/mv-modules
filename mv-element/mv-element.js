import { LitElement } from "lit";
import { MvStore } from "@meveo-org/mv-store";

export class MvElement extends LitElement {
  static get properties() {
    return {
      name: { type: String, attribute: true },
      storageModes: { type: String, attribute: "storage-modes" },
      config: { type: Object }
    };
  }

  getParentStore(element) {
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
        return this.getParentStore(element.parentNode);
      }
    } else {
      return null;
    }
  }

  connectedCallback() {
    // TODO set parent store to its first parent MvElement's store.
    let parentStore = this.getParentStore(this.parentNode);
    const { MEVEO } = this.config || {};
    const { REPOSITORY } = MEVEO || {};
    // initialise store from model
    // FIXME get repository from user info
    this.store = new MvStore(
      REPOSITORY || "default",
      this.attributes["name"].value,
      this,
      parentStore,
      this.config,
    );
    super.connectedCallback();
  }
}
