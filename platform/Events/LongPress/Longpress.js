window.EventListenerOptions = Object.assign(window.EventListenerOptions || {}, {
  PREVENTABLE_NONE: 0,   // the listener is not blocked by preventDefault, nor does it trigger preventDefault.     //this is the same as passive: true
  PREVENTABLE_SOFT: 1,   // the listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        // the listener is blocked by preventDefault, and will always call preventDefault when invoked.
});
const checkedPseudoKey = Math.random() + 1;  //this should probably be exportable.

const options = {
  preventable: EventListenerOptions.PREVENTABLE_SOFT,
  trustedOnly: true,
  capture: true
}

// import {FirstConnectedCallbackMixin} from "../FirstConnectedCallbackMixin.js";
// import {} from "../CustomElementsMix.js";

let primaryEvent;

var timer;
var duration = 300;
const target = document.querySelector("[long-press]");


function dispatchPriorEvent(target, composedEvent, trigger) {
  composedEvent.preventDefault = function () {
    trigger.preventDefault();
    trigger.stopImmediatePropagation ? trigger.stopImmediatePropagation() : trigger.stopPropagation();
  };
  composedEvent.trigger = trigger;
  return target.dispatchEvent(composedEvent);
}

function onDurationComplete() {
  if (!primaryEvent)
    return;
  // let longPress = new CustomEvent("long-press-active", {bubbles: true, composed: true, detail: duration});
  let longPress = new CustomEvent("long-press-start", {bubbles: true, composed: true, detail: duration});


  dispatchPriorEvent(primaryEvent.target, longPress, primaryEvent);
  timer = undefined;
  primaryEvent.preventDefault(); //todo: test it
}

function onMousedown(e) {
  if (e.button !== 0|| e.defaultPrevented)                                     //[3]
    return;
  if(!target)
    return;
  primaryEvent = e;                                       //[4]
  target.setAttributeNode(document.createAttribute("add-mouseup"), checkedPseudoKey);  //add mouseup
  target.removeAttribute("add-mouseup");

  timer = setTimeout(onDurationComplete, duration);

  // let longPress = new CustomEvent("long-press-start", {bubbles: true, composed: true, detail: duration});
  // dispatchPriorEvent(e.target, longPress, e);

}

function onMouseup(e) {
  if (e.button !== 0)                                     //[3]
    return;
  if (timer) {
    clearTimeout(timer);
    let longPress = new CustomEvent("long-press-endSequence", {bubbles: true, composed: true, detail: duration});
    dispatchPriorEvent(e.target, longPress, e);
  } else {
    let longPress = new CustomEvent("long-press-end", {bubbles: true, composed: true, detail: duration});
    dispatchPriorEvent(e.target, longPress, e);
  }
  target.setAttributeNode(document.createAttribute("remove-mouseup"), checkedPseudoKey);  //add mouseup
  target.removeAttribute("remove-mouseup");
  primaryEvent = undefined;                               //[7]
}

export class mouseUpToLongPress extends HTMLElement {
  static get observedAttributes() {
    return ["add-mouseup", "remove-mouseup"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "add-mouseup"){
      window.addEventListener('mouseup', onMouseup, options);
    }
    else{
      window.removeEventListener("mouseup", onMouseup, options);
    }

  }
}

export class mouseDownToLongPressStart extends HTMLElement {

  static get observedAttributes() {
    return ["long-press"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    window.addEventListener('mousedown', onMousedown, options);
  }
}
