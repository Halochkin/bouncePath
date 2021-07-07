//

//Basic version

//rule #2: all events propagate sync. No more async propagation for UI events. Which is good, because you can never
//         tell if an event is async or sync.
//rule #3: all adding of event listeners are dynamic.
//         No more special rule that event listeners on the same target(phase) can be removed, but not added.

//tip 1:   all event listeners are removed when the event stack is empty.
//tip 2:   AT_TARGET works 'the old way', as event listeners on the innermost target.
//         This means the sum of both capture and bubble event listeners run in insertion order, not necessarily capture before bubble.
//         It is my opinion that it might be better to always run capture before bubble, also at_target, but
//         the 'old way' is chosen because I guess that this will cause the least disturbances in existing web apps.

import {bounceSequence, composedPath, ContextIterator, PathIterator} from "./BouncedPath.js";
import {
  cleanupEvent,
  composedPathOG,
  initEvent,
  initNativeEvent,
  preInitState,
  preventContext,
  stopImmediatePropagationOG,
  updateEvent,
} from "./Event.js";

window.EventListenerOptions = Object.assign(window.EventListenerOptions || {}, {
  PREVENTABLE_NONE: 0,   // the listener is not blocked by preventDefault, nor does it trigger preventDefault.     //this is the same as passive: true
  PREVENTABLE_SOFT: 1,   // the listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        // the listener is blocked by preventDefault, and will always call preventDefault when invoked.
});

const listeners = Symbol("listeners");

//Rule x: reroute natively triggered window events to the html element.
// This makes the event visible in the DOM. It is necessary to have events "visit" the DOM
// because that makes two things possible:
// 1. it gives us a shadowDom to add default action event listeners in.
// 2. It gives us a good place to attach mixins with default actions that can be made visible as pseudo-attributes for example.
function onFirstNativeListener(e) {
  stopImmediatePropagationOG.call(e);
  const nativeComposedPath = composedPathOG.call(e);
  initNativeEvent(e);
  let innerMostTarget = nativeComposedPath[0];
  if (innerMostTarget === window || innerMostTarget === document) innerMostTarget = document.children[0];
  //the composed: true/false is broken. We need to find the root from the native composedPath() for focus events.
  propagate(e, innerMostTarget, nativeComposedPath[nativeComposedPath.length - 1], false, false, false);
  innerMostTarget.dispatchEvent(e);
}

function typeCheckListener(listen) {
  return listen instanceof Function || listen instanceof Object && listen.handleEvent instanceof Function;
}

function listenerOK(listener, type, phase, trusted) {
  if(listener.type !== type)
    return false;
  if(listener.capture && phase === Event.BUBBLING_PHASE)
    return false;
  if(!listener.capture && phase === Event.CAPTURING_PHASE)
    return false;
  if(listener.removed)
    return false;
  if(listener.trustedOnly && !trusted)
    return false;
  return true;
}

function* ListenerIterator(target, type, phase, trusted) {
  const list = target[listeners] || (target[listeners] = []);
  for (let i = 0; i < list.length; i++)
    if (listenerOK(list[i], type, phase, trusted))
      yield list[i];
}

function getListener(target, type, cb, capture) {
  target[listeners] || (target[listeners] = []);
  return target[listeners].find(old => old.type === type && old.cb === cb && old.capture === capture && !old.removed);
}

function defaultPassiveValue(type, target) {
  return (type === 'touchstart' || type === 'touchmove') && (target === window || target === document || target === body);
}

function addListenerImpl(l) {
  l.target[listeners].push(l);
  addEventListenerOG.call(l.target, l.type, l.realCb, {capture: l.capture, passive: l.passive});
}

function removeListenerImpl(l) {
  l.target[listeners].splice(l.target[listeners].indexOf(l), 1);
  removeEventListenerOG.call(l.target, l.type, l.realCb, {capture: l.capture, passive: l.passive});
}

const addEventListenerOG = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, cb, options) {
  // cb is function
  if (!typeCheckListener(cb))
    return;
  const capture = options instanceof Object ? options.capture : !!options;
  //--------------------------------------------------get old listeners (if such has been added)
  if (getListener(this, type, cb, capture))
    return;
  const target = this;
  const passive = options instanceof Object && 'passive' in options ? options.passive : defaultPassiveValue(type, target);
  const once = options instanceof Object && !!options.once;
  const preventable = +(options instanceof Object && 'preventable' in options && options.preventable);
  const trustedOnly = options instanceof Object && !!options.trustedOnly;
  const listener = {target, type, cb, capture, passive, once, preventable, trustedOnly};

  listener.realCb = onFirstNativeListener.bind(listener);
  //we don't use the listener object, but we need to bind the nativeEventListener to something to get a unique realCb.
  addListenerImpl(listener);
}

//REMOVE EVENT LISTENERS
const removedListeners = [];

function removeListener(listener) {
  listener && (listener.removed = true) && removedListeners.push(listener);
}

const removeEventListenerOG = EventTarget.prototype.removeEventListener;
EventTarget.prototype.removeEventListener = function (type, cb, options) {
  const capture = options instanceof Object ? options.capture : !!options;
  removeListener(getListener(this, type, cb, capture));
}

// DISPATCH EVENT
const eventStack = [];

function propagate(e, innerMostTarget, root, stopped, prevented, onHost) {
  //rule : reroute dispatch of all events on elements to their shadowRoot if not onHost: true.
  //todo replace the onHost with a check for e.defaultPrevented?? orr just remove the onHost all together?? we don't need it, nor want it??
  // todo this shouldnt conflict with .click() and .requestSubmit()..
  innerMostTarget instanceof Element && !onHost && (innerMostTarget = innerMostTarget.shadowRoot ?  innerMostTarget.shadowRoot: innerMostTarget);
  console.log(e.type);
  if (eventStack.includes(e))
    throw new Error("Failed to execute 'dispatchEvent' on 'EventTarget': The event is already being dispatched.");
  eventStack.unshift(e);
  const topMostContext = bounceSequence(innerMostTarget, root);
  topMostContext.stop = stopped;
  prevented && preventContext(topMostContext);
  initEvent(e, composedPath(innerMostTarget, root)); //todo add in property e.topContext = true?? so that inner contexts can know whether or not they are controlled?? why? we don't really need this info??
  main: for (let context of ContextIterator(topMostContext)) {
    updateEvent(e, 'context', context);
    for (let phase = 1; phase <= 3; phase++) {
      updateEvent(e, 'eventPhase', phase);
      for (let target of PathIterator(context.path, phase)) {
        let first;
        for (let listener of ListenerIterator(target, e.type, phase, e.isTrusted)) {  //todo there is a bug in ListenerIterator..
          if (e.defaultPrevented && listener.preventable > 0)   //preventable: PREVENTABLE_SOFT or PREVENTABLE
            continue;
          !first && (first = true) && updateEvent(e, 'currentTarget', target);
          if (listener.once)                                    //once: true
            removeListener(listener);
          try {
            /*const maybePromise = */listener.cb instanceof Function ? listener.cb.call(target, e) : listener.cb.handleEvent.call(listener.cb.handleEvent, e);
            //todo this is unnecessary, right? the browser already does this internally??
            // maybePromise instanceof Promise && maybePromise.catch(err=> window.dispatchEvent(new ErrorEvent('Uncaught Error', {error: err, message: err.message})));
          } catch (err) {
            window.dispatchEvent(new ErrorEvent('Uncaught Error', {error: err, message: err.message}));
            //todo this doesn't show up in devtools.. ??
          }
          if (listener.preventable === 2)                       //preventable: PREVENTABLE
            e.preventDefault();
          if (context.stopImme)                                 //stopImmediatePropagation
            continue main;
        }
        if (context.stop)                                       //stopPropagation
          continue main;
      }
    }
  }
  cleanupEvent(e, topMostContext);
  if (e !== eventStack.shift())
    throw new Error('Critical error in EventTarget.dispatchEvent().');
  !eventStack.length && removedListeners.map(removeListenerImpl);
}

EventTarget.prototype.dispatchEvent = function (e, options) {
  const root = options instanceof Object && 'root' in options ? options.root : e.composed;  //options root override e.composed.
  const {stopped, prevented} = preInitState(e);
  propagate(e, this, root, stopped, prevented, !!options?.onHost);
};
// todo start explanation from dispatchEvent only. second step is addEventListener take-over.
// todo explain the event stack as an addition to the event loop