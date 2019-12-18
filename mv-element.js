import { LitElement} from './lit-element.js';
import { MvStore } from './mv-store.js';
export * from './lit-element.js';

export class MvElement extends LitElement {

    static get properties() {
        return {
          name: {  type : String, attribute: true },
          storageModes: { type : String, attribute:'storage-modes'}
        };
    }

    getParentStore(element){
        if(element == undefined){
            return null;
        }
        if(element instanceof DocumentFragment){
            element=element.host;
        }
        if(element instanceof Element){
            if(element instanceof MvElement){
                return element.store;
            } else {
                return this.getParentStore(element.parentNode);
            }
        } else {
            return null;
        }
    }

    connectedCallback() {
        //TODO set parent store to its first parent MvElement's store.
        let parentStore=this.getParentStore(this.parentNode);
        //initialise store from model
        //FIXME get repository from user info
        this.store = new MvStore("OVH_integration",this.attributes['name'].value,this,parentStore);
        super.connectedCallback();
    }
    

}