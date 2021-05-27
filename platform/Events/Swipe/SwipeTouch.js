window.EventListenerOptions = Object.assign(window.EventListenerOptions || {}, {
  PREVENTABLE_NONE: 0,   // the listener is not blocked by preventDefault, nor does it trigger preventDefault.     //this is the same as passive: true
  PREVENTABLE_SOFT: 1,   // the listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        // the listener is blocked by preventDefault, and will always call preventDefault when invoked.
});
const checkedPseudoKey = Math.random() + 1;  //this should probably be exportable.

let supportsPassive = false;
try {
  const opts = Object.defineProperty({}, "passive", {
    get: function () {
      supportsPassive = true;
    }
  });
  window.addEventListener("test", null, opts);
  window.removeEventListener("test", null, opts);
} catch (e) {
}

const options = {
  preventable: EventListenerOptions.PREVENTABLE_SOFT,
  trustedOnly: true,
  capture: true,
}

if (supportsPassive)
  options.passive = false;


function captureEvent(e, stopProp) {
  e.preventDefault();
  stopProp && e.stopImmediatePropagation ? e.stopImmediatePropagation() : e.stopPropagation();
}

function filterOnAttribute(e, attributeName) {
  for (let el = e.target; el; el = el.parentNode) {
    if (!el.hasAttribute) return null;
    if (el.hasAttribute(attributeName)) return el;
  }
  return null;
}

function replaceDefaultAction(target, composedEvent, trigger) {      //[3] ReplaceDefaultAction
  composedEvent.trigger = trigger;
  trigger.stopTrailingEvent = function () {
    composedEvent.stopImmediatePropagation ? composedEvent.stopImmediatePropagation() : composedEvent.stopPropagation();
  };
  trigger.preventDefault();
  return setTimeout(function () {
    target.dispatchEvent(composedEvent)
  }, 0);
}

/*
 swipeStamp or relatedEvent?

timeStamp is created when the swipe-start event is dispatched. But. The swipe-start is a delayed event. It needs to have
both the timeStamp for when the event was dispatched, but also the timestamp for the touchstart event that for the user
represented the start of the swipe.

There are two ways to do that.
1. add a second timeStamp to the event, one timeStamp for the swipe-start event dispatch and one timeStamp for the touchstart dispatch.
2. add swipeEventStart.touchstartEvent which would then hold the pointer to the touchstart event that the swipe is mapping.
* */

function makeSwipeEvent(name, trigger) {
  const composedEvent = new TouchEvent("swipe-" + name, trigger);
  if (name === "start") {
    /*1.*/
    composedEvent.swipeStamp = trigger.timestamp;
    /*2.*/
    composedEvent.touchstartEvent = trigger;
  }
  composedEvent.x = trigger.changedTouches ? parseInt(trigger.changedTouches[0].clientX) : trigger.x;
  composedEvent.y = trigger.changedTouches ? parseInt(trigger.changedTouches[0].clientY) : trigger.y;
  return composedEvent;
}

let globalSequence;

const touchInitialListener = e => onTouchInitial(e);
const touchdownSecondaryListener = e => onTouchdownSecondary(e);
const touchmoveListener = e => onTouchmove(e);
const touchendListener = e => onTouchend(e);
const onBlurListener = e => onBlur(e);
const onSelectstartListener = e => onSelectstart(e);


function startSequence(target, e) {                                                            //5. Event Sequence
  const body = document.querySelector("body");
  const sequence = {
    target,
    cancelTouchout: target.hasAttribute("swipe-cancel-pointerout"),
    swipeDuration: parseInt(target.getAttribute("pointer-duration")) || 50,                    //6. EventAttribute
    swipeDistance: parseInt(target.getAttribute("pointer-distance")) || 100,
    recorded: [e],
    userSelectStart: body.style.userSelect,                                                    //10. Grabtouch
    touchActionStart: body.style.touchAction,
  };
  document.children[0].style.userSelect = "none";
  document.children[0].style.touchAction = "none";
  // Call attributeChangedCallback on each eventTranslator class to ADD listeners
  target.setAttributeNode(document.createAttribute("start-sequence"), checkedPseudoKey); //call attributeChangedCallback on each class
  return sequence;
}

function updateSequence(sequence, e) {                                                         //7. TakeNote
  sequence.recorded.push(e);
  return sequence;
}

function stopSequence(target) {
  document.children[0].style.userSelect = globalSequence.userSelectStart;
  document.children[0].style.touchAction = globalSequence.touchActionStart;
  // Call attributeChangedCallback on each eventTranslator class to REMOVE listeners
  target.setAttributeNode(document.createAttribute("stop-sequence"), checkedPseudoKey); //call attributeChangedCallback on each class
  return undefined;
}

let timer;

function longEnough(e) {
  const initialEvent = globalSequence.recorded[0];
  const lastEvent = globalSequence.recorded[globalSequence.recorded.length - 1];

  const initialX = parseInt(initialEvent.changedTouches[0].clientX);  //todo: do we need both x and y?
  const lastX = parseInt(lastEvent.changedTouches[0].clientX);

  const initialY = parseInt(initialEvent.changedTouches[0].clientY);  //todo: do we need both x and y?
  const lastY = parseInt(lastEvent.changedTouches[0].clientY);

  const distanceX = Math.abs(lastX - initialX);
  const distanceY = Math.abs(lastY - initialY);
  const composedEvent = makeSwipeEvent("start", initialEvent);
  const target = globalSequence.target;

  if (distanceX > 15 || distanceY > 15) {
    initialEvent.preventDefault();
    // initialEvent.stopImmediatePropagation(); //
    replaceDefaultAction(target, composedEvent, initialEvent);
  } else //do longpress or another gesture
    globalSequence = stopSequence(target);
  timer = undefined;
}


function onTouchInitial(trigger) {
  if (trigger.defaultPrevented)
    return;
  if (trigger.touches.length !== 1)           //support sloppy finger
    return;
  const target = filterOnAttribute(trigger, "swipe");
  if (!target)
    return;
  timer = setTimeout(longEnough, 100);
  captureEvent(trigger, false);
  globalSequence = startSequence(target, trigger);
}

function onTouchdownSecondary(trigger) {
  const cancelEvent = makeSwipeEvent("cancel", trigger);
  const target = globalSequence.target;
  globalSequence = stopSequence(target);
  replaceDefaultAction(target, cancelEvent, trigger);
}

function onTouchmove(trigger) {
  // wait until swipe-start will be dispatch, can`t stop sequence here, because we must cache all mousemove events to use it inside timeout callback
  const composedEvent = timer ? trigger : makeSwipeEvent("move", trigger);
  captureEvent(trigger, false);
  globalSequence = updateSequence(globalSequence, composedEvent);
  replaceDefaultAction(globalSequence.target, composedEvent, trigger);
}

function onTouchend(trigger) {
  trigger.preventDefault();
  const stopEvent = makeSwipeEvent("stop", trigger);
  if (!stopEvent) return;
  if (timer) {
    return clearTimeout(timer)
  }
  captureEvent(trigger, false);
  const target = globalSequence.target;
  globalSequence = stopSequence(target);
  replaceDefaultAction(target, stopEvent, trigger);
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

export class touchStartToSwipeStart extends HTMLElement {

  // initial touchstart listener
  firstConnectedCallback() {
    this.addEventListener('touchstart', touchInitialListener, options);
  }

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence") // remove initial event listener after start sequence
      this.removeEventListener('touchstart', touchInitialListener, options);
    else  //add new initial touchstart listener when sequence ends
      this.addEventListener('touchstart', touchInitialListener, options);
  }
}

export class touchMoveToSwipeMove extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('touchmove', touchmoveListener, options);
    else
      this.removeEventListener('touchmove', touchmoveListener, options);
  }
}

export class touchEndToSwipeStop extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('touchend', touchendListener, options);
    else
      this.removeEventListener('touchend', touchendListener, options);
  }
}

export class blurToSwipeCancel extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('blur', onBlurListener, options);
    else
      this.removeEventListener('blur', onBlurListener, options);
  }
}

export class selectStart extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('selectstart', onSelectstartListener, options);
    else
      this.removeEventListener('selectstart', onSelectstartListener, options);
  }
}

export class touchStartToSwipeCancel extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('touchstart', touchdownSecondaryListener, options);
    else
      this.removeEventListener('touchstart', touchdownSecondaryListener, options);
  }
}









