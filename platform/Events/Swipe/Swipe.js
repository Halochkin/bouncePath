// (function () {

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

function captureEvent(e, stopProp) {
  e.preventDefault();
  stopProp && e.stopImmediatePropagation ? e.stopImmediatePropagation() : e.stopPropagation();
}

function filterOnAttribute(e, attributeName) {                                                 //4. FilterByAttribute
  for (let el = e.target; el; el = el.parentNode) {
    if (!el.hasAttribute)
      return null;
    if (el.hasAttribute(attributeName))
      return el;
  }
  return null;
}

function replaceDefaultAction(target, composedEvent, trigger) {      //[3] ReplaceDefaultAction
  composedEvent.trigger = trigger;
  trigger.stopTrailingEvent = function () {
    composedEvent.stopImmediatePropagation ? composedEvent.stopImmediatePropagation() : composedEvent.stopPropagation();
  };
  // trigger.preventDefault();
  return setTimeout(function () {
    target.dispatchEvent(composedEvent)
  }, 0);
}


Object.defineProperty(MouseEvent.prototype, "x", {

  set: function (value) {
    this._x = value;
  }
});


function makeSwipeEvent(name, trigger) {
  const composedEvent = new MouseEvent("swipe-" + name, {bubbles: true, composed: true})

  const p = new Proxy(composedEvent, {
    set: function (object, property, value) {
      return object[property] = value;
    }
  });

  p._x = trigger.x;
  p._y = trigger.y;

  // composedEvent.x = trigger.x;
  // composedEvent.y = trigger.y;
  return composedEvent;
}

let globalSequence;
const mousedownInitialListener = e => onMousedownInitial(e);
const mousedownSecondaryListener = e => onMousedownSecondary(e);
const mousemoveListener = e => onMousemove(e);
const mouseupListener = e => onMouseup(e);
const onBlurListener = e => onBlur(e);
const onSelectstartListener = e => onSelectstart(e);


function startSequence(target, e) {                                                            //5. Event Sequence
  const body = document.querySelector("body");
  const sequence = {
    target,
    cancelMouseout: target.hasAttribute("swipe-cancel-pointerout"),
    swipeDuration: parseInt(target.getAttribute("pointer-duration")) || 50,                    //6. EventAttribute
    swipeDistance: parseInt(target.getAttribute("pointer-distance")) || 100,
    recorded: [e],
    userSelectStart: body.style.userSelect,                                                    //10. Grabtouch
  };
  document.children[0].style.userSelect = "none";
  // Call attributeChangedCallback on each eventTranslator class to ADD listeners
  if (target.hasAttribute("stop-sequence"))
    target.removeAttribute("stop-sequence")
  target.setAttributeNode(document.createAttribute("start-sequence"), checkedPseudoKey); //call attributeChangedCallback on each class
  target.removeAttribute("start-sequence")
  return sequence;
}

function updateSequence(sequence, e) {                                                         //7. TakeNote
  sequence.recorded.push(e);
  return sequence;
}

function stopSequence(target) {
  document.children[0].style.userSelect = globalSequence.userSelectStart;
  // Call attributeChangedCallback on each eventTranslator class to REMOVE listeners
  if (target.hasAttribute("start-sequence"))
    target.removeAttribute("start-sequence")
  target.setAttributeNode(document.createAttribute("stop-sequence"), checkedPseudoKey); //call attributeChangedCallback on each class
  target.removeAttribute("stop-sequence")
  return undefined;
}

let timer;

function longEnough(e) {
  const initialEvent = globalSequence.recorded[0];
  const lastEvent = globalSequence.recorded[globalSequence.recorded.length - 1];

  const initialX = initialEvent.x;  //we swipe left-right, so need only X
  const lastX = lastEvent.x;

  const distanceX = Math.abs(lastX - initialX)
  const composedEvent = makeSwipeEvent("start", initialEvent);    // fix
  const target = globalSequence.target;

  if (distanceX > 15) {
    initialEvent.preventDefault();
    initialEvent.stopImmediatePropagation();
    replaceDefaultAction(target, composedEvent, initialEvent);
  } else //do longpress or another gesture
    globalSequence = stopSequence(target);
  timer = undefined;
}

function onMousedownInitial(trigger) {
  if (trigger.button !== 0 || trigger.defaultPrevented)
    return;
  const target = filterOnAttribute(trigger, "swipe");  //fix this
  if (!target)
    return;

  timer = setTimeout(longEnough, 100);
  captureEvent(trigger, false);
  globalSequence = startSequence(target, trigger);

}

function onMousedownSecondary(trigger) {
  const cancelEvent = makeSwipeEvent("cancel", trigger);
  const target = globalSequence.target;
  globalSequence = stopSequence(target);
  replaceDefaultAction(target, cancelEvent, trigger);
}


function onMousemove(trigger) {
  if (!globalSequence.cancelMouseout && mouseOutOfBounds(trigger)) {
    const cancelEvent = makeSwipeEvent("cancel", trigger);
    const target = globalSequence.target;
    globalSequence = stopSequence(target);
    replaceDefaultAction(target, cancelEvent, trigger);
    return;
  }

  // here we need to dispatch swipe-start event after the difference between initial point and current point will me longer then 20? px during 10ms

  // wait until swipe-start will be dispatch, can`t stop sequence here, because must cache all mousemove events
  const composedEvent = timer ? trigger : makeSwipeEvent("move", trigger);
  // console.log(composedEvent.type, 777);
  captureEvent(trigger, false);
  globalSequence = updateSequence(globalSequence, composedEvent);
  replaceDefaultAction(globalSequence.target, composedEvent, trigger);
}

function onMouseup(trigger) {

  const stopEvent = makeSwipeEvent("stop", trigger);
  if (!stopEvent) return;

  // we must wait for swipe-start event to produce swipe-move

  if (timer) {
    return clearTimeout(timer)  //todo: dispatch cancel??
  }


  captureEvent(trigger, false);
  const target = globalSequence.target;
  globalSequence = stopSequence(target);
  replaceDefaultAction(target, stopEvent, trigger);
}

function mouseOutOfBounds(trigger) {
  return trigger.clientY < 0 || trigger.clientX < 0 || trigger.clientX > window.innerWidth || trigger.clientY > window.innerHeight;
}

function onBlur(trigger) {
  const blurInEvent = makeSwipeEvent("cancel", trigger);
  const target = globalSequence.target;
  globalSequence = stopSequence(target);
  replaceDefaultAction(target, blurInEvent, trigger);
}

function onSelectstart(trigger) {
  trigger.preventDefault();
  trigger.stopImmediatePropagation ? trigger.stopImmediatePropagation() : trigger.stopPropagation();
}

export class mouseDownToSwipeStart extends HTMLElement {

  // initial mousedown listener
  firstConnectedCallback() {
    window.addEventListener('mousedown', mousedownInitialListener, options);
  }

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence") // remove initial event listener after start sequence
      window.removeEventListener('mousedown', mousedownInitialListener, options);
    else  //add new initial mousedown listener when sequence ends
      window.addEventListener('mousedown', mousedownInitialListener, options);
  }
}

export class mouseMoveToSwipeMove extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      window.addEventListener('mousemove', mousemoveListener, options);
    else
      window.removeEventListener('mousemove', mousemoveListener, options);
  }
}

export class mouseUpToSwipeStop extends HTMLElement {


  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      window.addEventListener('mouseup', mouseupListener, options);
    else
      window.removeEventListener('mouseup', mouseupListener, options);
  }
}

export class blurToSwipeCancel extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {

    if (name === "start-sequence")
      window.addEventListener('blur', onBlurListener, options);
    else
      window.removeEventListener('blur', onBlurListener, options);
  }
}

export class selectStart extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      window.addEventListener('selectstart', onSelectstartListener, options);
    else
      window.removeEventListener('selectstart', onSelectstartListener, options);
  }
}


export class mouseDownToSwipeCancel extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      window.addEventListener('mousedown', mousedownSecondaryListener, options);
    else
      window.removeEventListener('mousedown', mousedownSecondaryListener, options);
  }
}









