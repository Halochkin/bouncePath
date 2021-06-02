/*
*
 You have a situation: two different elements listen for long-press and swipe for the same inner target.
 Now, both long-press and swipe shouldn't run at the same time, they should be preventDefault-sensitive to each other.
 This means that as soon as one of the gesture mixins switch from maybeObservationMode and to activeTriggeredMode,
 then it should alert the other gesture mixins for touch events that it has activated. It does so, by calling preventDefault()
 on the initial touchstart event that started the maybeObservationMode.

 preventDefault on touchstart when it kicks in. When a touch swipe mixin decides that this is a swipe, it needs to call
 touchstartEvent.preventDefault(). This communicates to the other mixins, such as touch-long-press, that also might
 observe this touch sequence, that they do should be blocked. Both such mixins also needs to check for defaultPrevented
 on the touchStartEvent during the initial observation, so that they don't start a second gesture for the same event.
  */

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
  // e.preventDefault();
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

function makeSwipeEvent(name, trigger) {
  return new MouseEvent("swipe-" + name, trigger);
}

let globalSequence;


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

function longEnough() {

  const settings = {
    minDist: 15,
    // maxDist: 120,
    maxTime: 700,
    minTime: 50
  }

  const initialEvent = globalSequence.recorded[0];
  const currentEvent = globalSequence.recorded[globalSequence.recorded.length - 1];

  const target = globalSequence.target;
  const composedEvent = makeSwipeEvent("start", initialEvent);

  const initialX = initialEvent.x;  //todo: do we need both x and y?
  const lastX = currentEvent.x;
  const initialY = initialEvent.y;  //todo: do we need both x and y?
  const lastY = currentEvent.y;
  const distX = lastX - initialX;
  const distY = lastY - initialY;

  const duration = currentEvent.timeStamp - initialEvent.timeStamp;

  if ((distX > settings.minDist || distY > settings.minDist) && duration < settings.maxTime) {
    initialEvent.preventDefault();
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
  if (!globalSequence?.cancelMouseout && mouseOutOfBounds(trigger)) {
    const cancelEvent = makeSwipeEvent("cancel", trigger);
    const target = globalSequence.target;
    globalSequence = stopSequence(target);
    replaceDefaultAction(target, cancelEvent, trigger);
    return;
  }
  // wait until swipe-start will be dispatch, can`t stop sequence here, because we must cache all mousemove events to use it inside timeout callback
  const composedEvent = timer ? trigger : makeSwipeEvent("move", trigger);
  captureEvent(trigger, false);
  globalSequence = updateSequence(globalSequence, composedEvent);
  replaceDefaultAction(globalSequence.target, composedEvent, trigger);
}

function onMouseup(trigger) {
  const stopEvent = makeSwipeEvent("stop", trigger);
  if (!stopEvent) return;
  // we must wait for swipe-start event to produce swipe-move
  if (timer) {
    return clearTimeout(timer)  //todo: dispatch cancel-event???
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
    window.addEventListener('mousedown', onMousedownInitial, options);
  }

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence") // remove initial event listener after start sequence
      window.removeEventListener('mousedown', onMousedownInitial, options);
    else  //add new initial mousedown listener when sequence ends
      window.addEventListener('mousedown', onMousedownInitial, options);
  }
}

export class mouseMoveToSwipeMove extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      window.addEventListener('mousemove', onMousemove, options);
    else
      window.removeEventListener('mousemove', onMousemove, options);
  }
}

export class mouseUpToSwipeStop extends HTMLElement {


  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      window.addEventListener('mouseup', onMouseup, options);
    else
      window.removeEventListener('mouseup', onMouseup, options);
  }
}

export class blurToSwipeCancel extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {

    if (name === "start-sequence")
      window.addEventListener('blur', onBlur, options);
    else
      window.removeEventListener('blur', onBlur, options);
  }
}

export class selectStart extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      window.addEventListener('selectstart', onSelectstart, options);
    else
      window.removeEventListener('selectstart', onSelectstart, options);
  }
}

export class mouseDownToSwipeCancel extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      window.addEventListener('mousedown', onMousedownSecondary, options);
    else
      window.removeEventListener('mousedown', onMousedownSecondary, options);
  }
}









