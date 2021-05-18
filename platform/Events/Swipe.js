// (function () {


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
  trigger.preventDefault();
  return setTimeout(function () {
    target.dispatchEvent(composedEvent)
  }, 0);
}


function makeSwipeEvent(name, trigger) {
  const composedEvent = new CustomEvent("swipe-" + name, {bubbles: true, composed: true});
  composedEvent.x = trigger.x;
  composedEvent.y = trigger.y;
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
  document.removeEventListener("mousedown", mousedownInitialListener, true);
  window.addEventListener("mousedown", mousedownSecondaryListener, true);
  window.addEventListener("mousemove", mousemoveListener, true);
  window.addEventListener("mouseup", mouseupListener, true);
  window.addEventListener("blur", onBlurListener, true);
  window.addEventListener("selectstart", onSelectstartListener, true);
  return sequence;
}

function updateSequence(sequence, e) {                                                         //7. TakeNote
  sequence.recorded.push(e);
  return sequence;
}

function stopSequence() {
  document.children[0].style.userSelect = globalSequence.userSelectStart;
  window.removeEventListener("mousemove", mousemoveListener, true);
  window.removeEventListener("mouseup", mouseupListener, true);
  window.removeEventListener("blur", onBlurListener, true);
  window.removeEventListener("selectstart", onSelectstartListener, true);
  window.removeEventListener("mousedown", mousedownSecondaryListener, true);
  document.addEventListener("mousedown", mousedownInitialListener, true);
  return undefined;
}

function onMousedownInitial(trigger) {
  if (trigger.button !== 0)
    return;
  const target = filterOnAttribute(trigger, "swipe");
  if (!target)
    return;
  const composedEvent = makeSwipeEvent("start", trigger);
  captureEvent(trigger, false);
  globalSequence = startSequence(target, composedEvent);
  replaceDefaultAction(target, composedEvent, trigger);
}

function onMousedownSecondary(trigger) {
  const cancelEvent = makeSwipeEvent("cancel", trigger);
  const target = globalSequence.target;
  globalSequence = stopSequence();
  replaceDefaultAction(target, cancelEvent, trigger);
}

function onMousemove(trigger) {
  if (!globalSequence.cancelMouseout && mouseOutOfBounds(trigger)) {
    const cancelEvent = makeSwipeEvent("cancel", trigger);
    const target = globalSequence.target;
    globalSequence = stopSequence();
    replaceDefaultAction(target, cancelEvent, trigger);
    return;
  }
  const composedEvent = makeSwipeEvent("move", trigger);
  captureEvent(trigger, false);
  globalSequence = updateSequence(globalSequence, composedEvent);
  replaceDefaultAction(globalSequence.target, composedEvent, trigger);
}

function onMouseup(trigger) {
  const stopEvent = makeSwipeEvent("stop", trigger);
  if (!stopEvent) return;
  captureEvent(trigger, false);
  const target = globalSequence.target;
  globalSequence = stopSequence();
  replaceDefaultAction(target, stopEvent, trigger);
}

function mouseOutOfBounds(trigger) {
  return trigger.clientY < 0 || trigger.clientX < 0 || trigger.clientX > window.innerWidth || trigger.clientY > window.innerHeight;
}

function onBlur(trigger) {
  const blurInEvent = makeSwipeEvent("cancel", trigger);
  const target = globalSequence.target;
  globalSequence = stopSequence();
  replaceDefaultAction(target, blurInEvent, trigger);
}

function onSelectstart(trigger) {
  trigger.preventDefault();
  trigger.stopImmediatePropagation ? trigger.stopImmediatePropagation() : trigger.stopPropagation();
}

// window.addEventListener("mousedown", onMousedownInitial);

// })();


export class mouseDownToSwipeStart extends HTMLElement {

  firstConnectedCallback() {
    window.addEventListener("mousedown", onMousedownInitial);
  }
}



