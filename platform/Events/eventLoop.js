import {bounceSequence, composedPath, ContextIterator} from "../bubble/BouncedPath.js";
import {initEvent, updateEvent} from "../bubble/Event.js";

const eventLoopElement = document.querySelector("event-loop");


class EventListenerRegistry {
  constructor() {
    this.map = {};
    this.listsWithRemoved = [];
  }

  //adds the event listener function to the registry, if the function is not already added for that target and type.
  //returns true when this is the first registered entry for this type and target.
  add(target, type, listener) {
    const listenersPerNode = this.map[type] || (this.map[type] = new WeakMap());
    let listeners = listenersPerNode.get(target);
    if (!listeners)
      return !!listenersPerNode.set(target, [listener]);
    if (listeners.indexOf(listener) >= 0)
      return false;
    const empty = listeners.every(f => !f);
    listeners.push(listener);
    return empty;
  }

  remove(target, type, listener) {
    const listeners = this.map[type]?.get(target);
    if (!listeners)
      return false;
    const index = listeners.indexOf(listener);
    if (index === -1)
      return false;
    listeners[index] = undefined;
    this.listsWithRemoved.push(listeners);
    return listeners.every(f => !f);
  }

  get(target, type) {
    return this.map[type]?.get(target);
  }

  cleanup() {
    for (let listeners; listeners = this.listsWithRemoved.pop();) {
      if (this.listsWithRemoved.indexOf(listeners) >= 0)//a list might be added twice, if so we clean it only the last time.
        continue;
      let length = listeners.length;
      for (let i = 0; i < length; i++) {
        if (listeners[i] === undefined)
          length--, listeners.splice(i--, 1);
      }
    }
  }
}


export function cacheEventElement(e, target) {
  if (!target)
    return;
  /* If the event is composed:true, then the event should be cancelled.
    Composed: false, then the  event doesn't need to
    be cancelled if the element is taken out of the DOM. */
  // if (e.composed) return; //todo: fix composed
  let eventElement = new EventElement();
  eventElement.original = e;
  let currentEvent = document.querySelector("event-element[\\:now]");
  if (currentEvent)
    currentEvent.removeAttribute(":now");
  eventElement.setAttribute(":now", Date.now());
  eventElement.attributes = {target: target, type: e.type, prevented: e.defaultPrevented};
  //TODO: SHOULD i USE SETTER ONLY FOU :UID??
  if (target.attributes && target.attributes.length) {
    if (Array.from(target.attributes).find(
      attr => attr?.nodeName.includes("maybe") || attr?.nodeName.includes("dragging")))
      eventElement.setAttributeNode(document.createAttribute(Array.from(target.attributes).find(
        attr => attr?.nodeName.includes("maybe") || attr?.nodeName.includes("dragging")).nodeName));
  }
  eventLoopElement.appendChild(eventElement);
}


function dispatchEventImpl(ctx, e, options) {
  dispatchEventOG.call(ctx, e, options);
}

const dispatchEventOG = EventTarget.prototype.dispatchEvent;
// Always the dispatchEvent () makes an <event> element and adds it at the end of the <event-loop>.
// It is only the dispatchEvent function that adds and removes the :now attr on the event-element.
EventTarget.prototype.dispatchEvent = function (e, options) {
  cacheEventElement(e, this);
  dispatchEventImpl(this, e, options);
}


function preventDefaultImpl(target) {
  preventDefaultOG.call(target);
}

const preventDefaultOG = Event.prototype.preventDefault;
Event.prototype.preventDefault = function () {
  // preventDefaultImpl(this);
  const lastEvenElement = Array.from(document.querySelectorAll(`event-element[type=${this.type}]`)).pop();
  /* Whenever preventDefault () is called on an event, the <event-element :prevent-default> attribute is set. */
  if (lastEvenElement)
    lastEvenElement.setAttributeNode(document.createAttribute(":prevent-default"));
}

export class EventLoop extends HTMLElement {
  constructor() {
    super();
    const config = {
      childList: true,
      // attributes: true
    };

    const observer = new MutationObserver(this.mutationCallback);
    observer.observe(this, config);
  }

  /* takes the elements from the DOM that is after :now.*/
  static runNextTasks(d) {
    const waitingElements = Array.from(document.querySelectorAll(`[\\:now] ~ *`));
    while (waitingElements.length) {
      for (const waitingElement of waitingElements) {

        if (waitingElement?.tagName === "TIME-OUT") {
          const cb = waitingElement.callback;
          const delay = waitingElement.delay;
          const timeoutAttribute = waitingElement.getAttribute("timestamp");
          if (Date.now() > timeoutAttribute)
            setTimeoutImpl(null, cb, delay);
        }

        if (waitingElement.tagName === "EVENT-ELEMENT") {
          const e = waitingElement.original;  //todo:
          const targetName = waitingElement.getAttributeNames().find(attr => attr.startsWith(":target")).split(
            "-")[1];
          let target;
          if (!isNaN(parseInt(targetName))) /*get target id :target-0 is integer*/
            target = targetArray[targetName];
          else {
            if (targetName === "document")
              target = document;
            if (targetName === "window")
              target = window;
          }

          if (!target)
            return;
          /*propagate() <event-element>*/
          propagate(e, target, window)
        }

        waitingElements.shift();
        /*todo: call OGSetTimeout*/

      }
    }
  }


  mutationCallback(mutationsList, observer) {
    for (let mutation of mutationsList) {
      /*if element has been removed but not added*/
      if (!mutation.addedNodes.length)
        return;
      /*Sort UI and time-out elements*/
      const timeOutElement = mutation.target.querySelector("time-out");  /* get first timeout and .before() new <event-element> */
      if (timeOutElement)
        timeOutElement.before(mutation.addedNodes[0]);
      EventLoop.runNextTasks();
    }
  }
}


function setTimeoutImpl(ctx, cb, ms) {
  setTimeoutOG.call(ctx, cb, ms);
}

const setTimeoutOG = window.setTimeout;

// Also. The <time-out>s are always sorted after UI events, when they are after :now, like the real event-loop in the browser does it.
window.setTimeout = function (cb, ms) {
  const to = document.createElement("time-out");
  to.callback = cb;
  to.delay = ms;
  to.setAttribute("timestamp", Date.now() + ms);
  eventLoopElement.appendChild(to);
}


export class TimeoutElement extends HTMLElement {
  //todo: add some methods here??
}


// const targetArray = [];


// const targetStorage = (function () {
//   let instance;
//
//   const targetArray = [new WeakRef({})];
//
//
//   const getIndex = (element) => {
//     let index = targetArray.indexOf(element);
//     return index === -1 ? addElement(element) : index;
//   }
//
//   const addElement = function (element) {
//     targetArray.push(element);
//     return targetArray.length - 1;
//   }
//
//   const createInstance = function () {
//     return {
//       getIndex: getIndex,
//       addElement: addElement
//     }
//   }
//
//   return {
//     createTargetArray: function (element) {
//       return instance || (instance = createInstance());
//     }
//   }
// })();


const targetWeakRefObj = new WeakRef({});
let instance;

targetWeakRefObj.targetArray = [];

targetWeakRefObj.getIndex = (element) => {
  let index = targetWeakRefObj.targetArray.indexOf(element);
  return index === -1 ? targetWeakRefObj.addElement(element) : index;
}

targetWeakRefObj.addElement = function (element) {
  targetWeakRefObj.targetArray.push(element);
  return targetWeakRefObj.targetArray.length - 1;
}


targetWeakRefObj.createInstance = function () {
  return {
    getIndex: this.getIndex,
    addElement: this.addElement
  }
}


targetWeakRefObj.createTargetArray = function (element) {
  return instance || (instance = this.createInstance());
}


let arr = targetWeakRefObj.createTargetArray();
debugger;


export class EventElement extends HTMLElement {

  set attributes(val) {
    let {target, type, prevented} = val;


    const targetId = arr.getIndex(target);

    debugger

    // //TODO: SINGLETON ARRAY
    // let targetId, index = targetArray.indexOf(target);
    // index === -1 ? (targetArray.push(target), targetId = targetArray.length - 1) : targetId = index;


    this.setAttribute("type", type);
    if (prevented)
      this.setAttributeNode(document.createAttribute(":prevent-default"));
    if (target instanceof DocumentFragment)
      return this.setAttributeNode(document.createAttribute(":targetShadow-" + targetId));  /* The document and shadowRoots do not have an element. We must therefore mark them as something like :targetShadow-id123 */
    if (target === document)        /* And the main document is simply :target-document and window is :target-window. */
      return this.setAttributeNode(document.createAttribute(":target-document"));
    if (target === window)
      return this.setAttributeNode(document.createAttribute(":target-window"));
    this.setAttribute(":uid", targetId); //todo: clarify this

  }
}


const setAttributeNodeOG = EventElement.prototype.setAttributeNode;
const setAttributeOG = EventElement.prototype.setAttribute;

Object.defineProperties(EventElement.prototype, {
  setAttributeNode: {
    value: function (node) {
      if (node.name !== ":uid") setAttributeNodeOG.call(this, node);
    }
  },
  setAttribute: {
    value: function (attr, val) {
      if (val !== ":uid") setAttributeOG.call(this, attr, val);
    }
  }


})


// EVENT PROPAGATION
const eventStack = [];
const listeners = new EventListenerRegistry();

function propagate(e, innermostTarget, root, composedPathIn) {
  if (e.eventPhase !== Event.NONE)
    throw new Error("Cannot dispatch the same Event twice.");

  composedPathIn = composedPathIn || composedPath(innermostTarget, root);
  if (innermostTarget.shadowRoot)
    composedPathIn.unshift(innermostTarget = innermostTarget.shadowRoot);

  eventStack.push(e);
  initEvent(e, composedPathIn);
  const type = e.type;
  const topMostContext = bounceSequence(innermostTarget, root);
  for (let context of ContextIterator(topMostContext)) {
    updateEvent(e, 'context', context);
    if (e.defaultPrevented)
      continue;
    for (let target of context.path) {
      const list = listeners.get(target, type);
      if (list) {
        updateEvent(e, 'currentTarget', target);
        for (let fun of list)
          fun?.call(target, e);
      }
    }
  }
  updateEvent(e, 'eventPhase', Event.FINISHED);
  updateEvent(e, 'context', topMostContext);
  updateEvent(e, 'currentTarget', undefined);

  eventStack.pop() &&
  !eventStack.length &&
  listeners.cleanup();
}