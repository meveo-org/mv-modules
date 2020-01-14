import "jsonata";

const fetchModelSchema = async className =>
  (await fetch("./model/" + className + ".json")).json();
const fetchModelSchemaSync = className => {
  var request = new XMLHttpRequest();
  request.open("GET", "./model/" + className + ".json", false); // `false` makes the request synchronous
  request.send(null);
  if (request.status === 200) {
    return JSON.parse(request.responseText);
  }
};

const fetchCEISync = (repository, className, filter) => {
  var request = new XMLHttpRequest();
  request.open(
    "POST",
    "../../../api/rest/" + repository + "/persistence/" + className + "/list",
    false
  ); // `false` makes the request synchronous
  request.setRequestHeader("Content-Type", "application/json");
  request.send(JSON.stringify({ filters: filter }));
  if (request.status === 200) {
    let result = JSON.parse(request.responseText);
    //FIXME ahould do something more reliable
    if (result.length === 1) {
      return result[0];
    } else {
      return result;
    }
  }
};

const storeCEIAsynch = (repository, name, className, state) => {
  fetch("../../../api/rest/" + repository + "/persistence", {
    method: "post",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    },
    body: JSON.stringify([{ name: name, type: className, properties: state }])
  })
    .then(data => console.log(JSON.stringify(data))) // JSON-string from `response.json()` call
    .catch(error => console.error(error));
};

String.prototype.evaluateOnContext = function(params) {
  const names = Object.keys(params);
  const vals = Object.values(params);
  return new Function(...names, `return \`${this}\`;`)(...vals);
};

export class MvStore {
  /**
     * A MvStore holds the state of a component and of some of its childs
     * If no parentStore is provided then the store is a root store
     * if not it is a sub store of its parent, accessible by its name.
     * The model describes the model class, that resolve to a json schema file,
     * and mapping rules between the model and the props of the element.
     * @param {*} name
     * @param {*} element
     * @param {*} parentStore
     */
  constructor(repository, name, element, parentStore = null) {
    this.repository = repository;
    this.name = name;
    this.element = element;
    this.parentStore = parentStore;
    this.listeners = {};
    this.subStores = {};
    this.state = parentStore == null ? {} : parentStore.registerSubStore(this);
    this.localStore = false;
    this.serverStore = false;
    if (this.element.storageModes) {
      this.localStore = this.element.storageModes.includes("local");
      this.serverStore = this.element.storageModes.includes("server");
    }
    if (element.constructor.model) {
      this.model = element.constructor.model;
      if (this.model.mappings) {
        this.registerElementListener(
          element,
          element.constructor.model.mappings,
          false,
          this
        );
      }
    }
    if (this.localStore || this.serverStore) {
      // if (this.parentStore) { console.log("before initLocalState " + this.name + " : " + (this.state === this.parentStore.state[this.name])) }
      this.initLocalState();
      // if (this.parentStore) { console.log("after initLocalState " + this.name + " : " + (this.state === this.parentStore.state[this.name])) }
    }
    this.dispatch("");
    // if (this.parentStore) { console.log("after dispatch " + this.name + " : " + (this.state === this.parentStore.state[this.name])) }
  }

  initLocalState() {
    if (this.model && this.model.modelClass) {
      let schema = fetchModelSchemaSync(this.model.modelClass);
      if (schema.type === "object") {
        Object.getOwnPropertyNames(schema.properties).forEach(key => {
          let value = schema.properties[key];
          if (this.state[key] === undefined) {
            if (value.type === "array") {
              this.state[key] = [];
            } else if (value.type === "object") {
              this.state[key] = {};
            } else if (value.type === "string") {
              this.state[key] = "";
            } else if (value.type === "number") {
              this.state[key] = 0.0;
            } else if (value.type === "integer") {
              this.state[key] = 0;
            } else if (value.type === "boolean") {
              this.state[key] = false;
            } else if (value.type === "null") {
              this.state[key] = null;
            }
            //set state to initial value from element, typically from attribute
            if (this.element[key] !== undefined) {
              this.state[key] = this.element[key];
            }
          }
        });
      }
    }
    this.loadState();
  }

  extractNamesFromAst(ast, names) {
    if (ast.hasOwnProperty("type") && ast.type === "path") {
      const value = ast.steps.reduce((acc, step) => {
        if (step.type === "name") {
          if (acc === "") {
            return step.value;
          } else {
            return acc + "." + step.value;
          }
        } else {
          return acc;
        }
      }, "");
      if (names.indexOf(value) === -1) {
        names.push(value);
      }
    } else {
      Object.keys(ast).forEach(k => {
        if (
          Array.isArray(ast[k]) &&
          ["arguments", "expressions", "steps"].includes(k)
        ) {
          for (let a of ast[k]) {
            if (typeof a === "object") {
              this.extractNamesFromAst(a, names);
            }
          }
        } else if (typeof ast[k] === "object") {
          this.extractNamesFromAst(ast[k], names);
        }
      });
    }
  }

  extractNamesFromMappings(mappings, names) {
    for (const mapping of mappings) {
      if (mapping.value) {
        if (names.indexOf(mapping.value) === -1) {
          names.push(mapping.value);
        }
      } else if (mapping.jsonataExpression) {
        if (!mapping.jsonata) {
          mapping.jsonata = jsonata(mapping.jsonataExpression);
        }
        this.extractNamesFromAst(mapping.jsonata.ast(), names);
      }
    }
  }

  registerElementListener(element, mappings, names, store) {
    mappings = mappings.map(m => {
      if (m.jsonataExpression) {
        return { ...m, jsonata: jsonata(m.jsonataExpression) };
      }
      return m;
    });
    if (!names) {
      names = [];
      this.extractNamesFromMappings(mappings, names);
    }
    if (this.parentStore) {
      names = names.map(name => this.name + "." + name);
      this.parentStore.registerElementListener(
        element,
        mappings,
        names,
        !store ? this : store
      );
    } else {
      for (let name of names) {
        if (!this.listeners[name]) {
          this.listeners[name] = [];
        }
        this.listeners[name].push({
          element,
          mappings,
          store: !store ? this : store
        });
        // console.log("register listener on " + name);
      }
    }
  }

  /**
     * Register Substore in this parent store by the substore name
     * and returns the state assciated to this substore (wich is a substate of the parent state)
     * If a substore with same name exist then it is overriden
     * @param {*} substore
     */
  registerSubStore(substore) {
    this.subStores[substore.name] = substore;
    return this.getState(substore.name);
  }

  getState(name) {
    if (this.parentStore) {
      return this.parentStore.getState(
        this.name + (name === "" ? "" : "." + name)
      );
    } else {
      if (!this.state[name]) {
        this.state[name] = {};
      }
      return this.state[name];
    }
  }

  dispatch(storeName = "", itemName = null) {
    if (this.parentStore) {
      this.parentStore.dispatch(
        this.name + (storeName === "" ? "" : "." + storeName),
        itemName
      );
    } else {
      let interestedListeners = [];
      Object.keys(this.listeners).forEach(listenerName => {
        let addListener = false;
        if (itemName == null) {
          addListener =
            listenerName === storeName ||
            listenerName.startsWith(storeName + ".") ||
            storeName === "";
        } else {
          addListener =
            listenerName === storeName ||
            listenerName === storeName + "." + itemName;
        }
        if (addListener) {
          for (const listener of this.listeners[listenerName]) {
            if (interestedListeners.length === 0) {
              interestedListeners.push(listener);
            } else {
              let listenerExists = false;
              for (const l of interestedListeners) {
                if (l.element === listener.element) {
                  listenerExists = true;
                  break;
                }
              }
              if (!listenerExists) {
                interestedListeners.push(listener);
              }
            }
          }
        }
      });
      // console.log("dispatch " + storeName + "." + itemName + " to " + interestedListeners.length + " listeners");
      for (const listener of interestedListeners) {
        let element = listener.element;
        for (const mapping of listener.mappings) {
          if (mapping.jsonata) {
            element[mapping.property] = mapping.jsonata.evaluate(
              listener.store.state
            );
          } else if (
            mapping.value &&
            (itemName == null || mapping.value === itemName)
          ) {
            element[mapping.property] = listener.store.state[mapping.value];
          }
        }
      }
    }
  }

  filterOutSubstores(state, substoreNames) {
    return substoreNames.reduce(
      (result, key) =>
        state[key] !== undefined
          ? Object.assign(result, { [key]: state[key] })
          : result,
      {}
    );
  }

  /** State storage function */
  storeState() {
    if (this.serverStore) {
      storeCEIAsynch(
        this.repository,
        this.name,
        this.model.modelClass,
        this.state
      );
    }
    if (this.localStore && this.parentStore) {
      this.parentStore.storeState();
    } else {
      if (this.localStore) {
        localStorage.setItem(this.name, JSON.stringify(this.state));
      }
    }
  }

  /**TODO implement storage of sub stores independantly */
  loadState() {
    if (this.serverStore) {
      if (this.model.filters) {
        let filter = {};
        for (let filterName of this.model.filters) {
          if (this.element[filterName] != null) {
            filter[filterName] = this.element[filterName];
          }
        }
        let data = fetchCEISync(this.repository, this.model.modelClass, filter);
        if (data != null) {
          this.state = { ...this.state, ...data };
        }
      }
    }
    if (!this.parentStore && this.localStore) {
      let loadedState = JSON.parse(localStorage.getItem(this.name));
      if (loadedState != null) {
        this.state = { ...this.state, ...loadedState };
      }
    }
  }

  /** State mutation functions */
  updateValue(itemName, newValue, dispatch = true) {
    this.state[itemName] = newValue;
    this.storeState();
    if (dispatch) {
      this.dispatch(itemName);
    }
  }

  //functions used to mutate an array in the local store
  addItem(itemName, item, dispatch = true) {
    this.removeItem(itemName, item, false);
    this.state[itemName] = [...this.state[itemName], item];
    this.storeState();
    if (dispatch) {
      this.dispatch(itemName);
    }
  }

  removeItem(itemName, item, dispatch = true) {
    //FIXME we should get the filter from the model
    this.state[itemName] = this.state[itemName].filter(
      t => t.value !== item.value
    );
    this.storeState();
    if (dispatch) {
      this.dispatch(itemName);
    }
  }

  updateItem(itemName, item, dispatch = true) {
    //FIXME we should get the filter from the model
    this.state[itemName] = this.state[itemName].map(t => {
      if (t.value === item.value) {
        t = { ...t, ...item };
      }
      return t;
    });
    this.storeState();
    if (dispatch) {
      this.dispatch(itemName);
    }
  }
}
