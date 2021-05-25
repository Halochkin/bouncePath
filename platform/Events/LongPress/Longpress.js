window.EventListenerOptions = Object.assign(window.EventListenerOptions || {}, {
  PREVENTABLE_NONE: 0,   // the listener is not blocked by preventDefault, nor does it trigger preventDefault.     //this is the same as passive: true
  PREVENTABLE_SOFT: 1,   // the listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        // the listener is blocked by preventDefault, and will always call preventDefault when invoked.
});
const checkedPseudoKey = Math.random() + 1;  //this should probably be exportable.


// import {FirstConnectedCallbackMixin} from "../FirstConnectedCallbackMixin.js";
// import {} from "../CustomElementsMix.js";

let primaryEvent;

var timer;
var duration = 300;

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
  let longPress = new CustomEvent("long-press-active", {bubbles: true, composed: true, detail: duration});
  dispatchPriorEvent(primaryEvent.target, longPress, primaryEvent);
  timer = undefined;
}

function onMousedown(e) {
  if (e.button !== 0)                                     //[3]
    return;
  primaryEvent = e;                                       //[4]
  this.setAttributeNode(document.createAttribute("is-longer"), checkedPseudoKey);  //add mouseup
  timer = setTimeout(onDurationComplete, duration);
  primaryEvent.target.classList.add("long-press");
  let longPress = new CustomEvent("long-press-start", {bubbles: true, composed: true, detail: duration});
  dispatchPriorEvent(e.target, longPress, e);
}

function onMouseup(e) {
  if (!primaryEvent || e.button !== 0)
    return;
  var duration = e.timeStamp - primaryEvent.timeStamp;
  if (duration > 300) {
    var longPress = new CustomEvent("long-press", {bubbles: true, composed: true, detail: {duration: duration}});
    dispatchPriorEvent(e.target, longPress, e);
  }
  primaryEvent = undefined;
}

export class mouseUpToLongPress extends HTMLElement {
  static get observedAttributes() {
    return ["is-longer"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.removeAttribute("is-longer");
    this.addEventListener('mouseup', onMouseup, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}

export class mouseDownToLongPressStart extends HTMLElement {

  static get observedAttributes() {
    return ["long-press"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.addEventListener('mousedown', onMousedown, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}
