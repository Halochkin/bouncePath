import {FirstConnectedCallbackMixin} from "../../platform/FirstConnectedCallbackMixin.js";
import {} from "../../platform/CustomElementsMix.js";
import {TranslateClickToChangeRadio, ChangeTogglesCheckedRadio} from "../../platform/Events/ClickToChange.js";

const checkedPseudoKey = Math.random() + 1;  //this should probably be exportable.

window.EventListenerOptions = Object.assign(window.EventListenerOptions || {}, {
  PREVENTABLE_NONE: 0,   // the listener is not blocked by preventDefault, nor does it trigger preventDefault.     //this is the same as passive: true
  PREVENTABLE_SOFT: 1,   // the listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        // the listener is blocked by preventDefault, and will always call preventDefault when invoked.
});

class markDefaultChecked extends HTMLElement {


  firstConnectedCallback() {

    this.addEventListener("change", e => console.log(e.relatedTarget))
    const nonGroupedChecked = document.querySelectorAll("custom-input:not([name])[checked]");
    const groupNames = [];

    // get all possible group names and push only unique
    document.querySelectorAll(this.tagName + "[name]").forEach(item => {
      const value = item.getAttribute("name");
      if (!groupNames.includes(value))
        groupNames.push(value)
    });

    const formElements = document.querySelectorAll("form");
    for (const formElement of formElements) {
      //each item inside form has .form property which define its form
      const allChildren = formElement.querySelectorAll(this.tagName);
      allChildren.forEach(item => item.form = formElement); // define .form property

      // select all items from group and get only last, i.e all previous with
      const lastInGroup = [];
      for (const group of groupNames) {

        let res = formElement.querySelectorAll(`[checked][name=${group}]`);
        if (res.length)
          lastInGroup.push(res[res.length - 1]);
      }

      // set :checked attribute to shadow element to highlight it
      for (const [index, item] of Object.entries([...nonGroupedChecked, ...lastInGroup])) {
        item.checked = true;
        item?.shadowRoot?.lastElementChild.setAttributeNode(document.createAttribute("checked"), checkedPseudoKey);
      }
    }
  }
}

class customInput extends FirstConnectedCallbackMixin(HTMLElement) {

  connectedCallback() {
    if (super.connectedCallback) super.connectedCallback();
  }

  firstConnectedCallback() {
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = `
      <style>
       div{
       border-radius: 20%;
       background-color: white;
       border: 1px solid gray;
       height: 10px;
       width: 10px;
       margin: 3px;
       display: inline-block;
       }

       div[checked] {
       border-radius: 20%;
       background-color: blue;
        color: white;
       content: "+";
       }

      </style>
      <div></div>
      `
  }
}

customElements.mix("custom-input",
  [ChangeTogglesCheckedRadio, TranslateClickToChangeRadio, markDefaultChecked, customInput])
