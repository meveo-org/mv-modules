import { LitElement, html, css } from "lit-element";
import { MvElement } from "mv-element";

// ========= TaskItem - END =========
class TaskItem extends MvElement {
  static get properties() {
    return {
      task: { type: String },
      details: { type: String },
      completed: { type: Boolean },
      dateCompleted: { type: Number },
    };
  }

  static get model() {
    return {
      modelClass: "TaskItem",
      mappings: [
        { property: "task", value: "task" },
        { property: "details", value: "details" },
        { property: "completed", value: "completed" },
        { property: "dateCompleted", value: "dateCompleted" },
      ],
    };
  }

  render() {
    return html` <div>Task Item</div> `;
  }
}

customElements.define("task-item", TaskItem);
// ========= TaskItem - END =========

// ========= TaskList - START =========
class TaskList extends MvElement {
  static get properties() {
    return {
      title: { type: String },
      description: { type: String },
      tasks: { type: Array, attribute: false },
    };
  }

  static get model() {
    return {
      modelClass: "TaskList",
      refSchemas: ["TaskItem"],
      mappings: [
        { property: "title", value: "title" },
        { property: "description", value: "description" },
        { property: "tasks", value: "tasks" },
      ],
    };
  }

  render() {
    return html`
      <fieldset>
        <legend>${this.title}</legend>
        <div>${this.description}</div>
        <task-item name="tasks" storage-modes="local"></task-item>
      </fieldset>
    `;
  }
}

customElements.define("task-list", TaskList);
// ========= TaskList - END =========

const EMPTY_TASK_FORM = {
  title: "",
  description: "",
  tasks: [],
};

// ========= TasksApp - START =========
export class TasksApp extends MvElement {
  static get properties() {
    return {
      editForm: { type: Boolean, attribute: false },
    };
  }

  static get model() {
    return {
      modelClass: "TasksApp",
      refSchemas: ["TaskList", "TaskItem"],
      filterProp: "title",
      // filterFunc: (oldVal, newVal) => oldVal.title === newVal.title,
    };
  }

  static get styles() {
    return css`
      form {
        max-width: 300px;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-row-gap: 5px;
      }
      label {
        font-weight: bold;
        margin-right: 10px;
        text-align: right;
      }
    `;
  }

  constructor() {
    super();
    this.editForm = false;
    this.taskForm = EMPTY_TASK_FORM;
  }

  showForm = () => {
    this.editForm = true;
  };

  updateField = (name) => (event) => {
    const {
      target: { value },
    } = event;
    this.taskForm = { ...this.taskForm, [name]: value };
  };

  clearForm = () => {
    this.editForm = false;
    this.taskForm = EMPTY_TASK_FORM;
  };

  addTaskList = (event) => {
    event.preventDefault();
    console.log("this.store: ", this.store);
    this.store.addItem("tasklists", { ...this.taskForm });
    this.clearForm();
  };

  render = () => {
    return html`
      <h1>mv-modules</h1>
      <button @click="${this.showForm}">New task list</button>
      ${this.editForm
        ? html`
            <h2>Create new task list</h2>
            <form>
              <label for="name-field">Name: </label>
              <input id="name-field" @change="${this.updateField("title")}" />
              <label for="description-field">Description: </label>
              <input
                id="description-field"
                @change="${this.updateField("description")}"
              />
              <button @click="${this.addTaskList}">Add</button>
            </form>
          `
        : null}
      <task-list name="tasklists" storage-modes="local"></task-list>
    `;
  };
}

customElements.define("tasks-app", TasksApp);
