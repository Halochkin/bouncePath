//Why remove EventListenerOptions? benefit: muuuuch simpler, drawback: harder to implement passive, once must be implemented manually

//Bounce bubble only

//rule #0:  No eventListenerOptions!! bubble only. And no event option bubbles: true/false.
//rule #1:  bubble only. capture and at_target phase does not exist.
//          Thus, if there are any event listener options, that must be an Object.
//rule #2:  All events propagate sync. No more async propagation for UI events.
//          Which is good, because you can never tell if an event is async or sync.
//rule #3:  Event listeners can be both added and removed from the currentTarget dynamically.
//          No more special rule that event listeners on the same target(phase) can be removed, but not added.
//rule #4:  no stopPropagation(). No more torpedoes.
//rule #5:  Event objects cannot be dispatched twice.
//rule #6:  Dom events do not propagate to the window, they stop on the document.
//rule #7:  All native events are directed at the shadowRoot of the element, if it has one.
//          This will run default actions when an element is targeted.
//rule #8:  preventDefault() will stop propagation into used documents.
//          enableDefault(el) and preventDefault(el) can target a single element only.
//rule #9:  Event listener must be a Function. No more messing around with {.handleEvent} objects.
//rule #10: The old onclick, onmouseenter, onXyz no longer works. The only way is addEventListener(xyz, ...).
//rule #11: The event doesn't specify the composed: true/false.
//          It specifies the 'root' EventTarget (element, Document, DocumentFragment).
//          Or should this be in the dispatchEvent function. I think maybe this.
//rule #12: You can't call .preventDefault() before event propagation.

//x: Problems:
// Nested events. All native events are queued linearly, in the event loop. Not even toggle or reset after click are run nestedly.
// However, script driven events are dispatched immediately, and so if an event listener for eventA dispatches an eventB,
// then all the event listeners for eventB will run before the next eventA listener.
// Are event properties immutable? Do events have mutable properties such as .timeStamp and .type?
// Or is it only .defaultPrevented that are mutable?

//Problem y: Some events run async and some run sync. Even for the same type of event, such as click. This is bad.
//           It is better if they all run according to the same timer logic and treats the delay between event listeners
//           the same. It is also better if this can be set by the developer, so that some event listeners run sync and
//           some async.
//
// setTimeouts as part of the event loop. They must be

//question #x: how to implement passive: true? add a setter/getter passiveListeningOrSomething to EventTarget that
//             will add a native event listener for touch and wheel with passive true/false instead of the default.

//question #y: the path is calculated at the outset of each dynamic inside the different documents? That kinda feels appropriate...
//         why not? why freeze the inside of the document?

//:on attribute on the event objects, and then remove the :on when the propagation is finished
//event[\\:on]:last
//event[\\:on='going']
//timeout[\\:on]

import {bounceSequence, calculateRoot, composedPath, ContextIterator} from "./BouncedPath.js";
import {initEvent, updateEvent} from "./Event.js";
import {EventListenerRegistry} from "./EventListenerRegistry.js";
import {FirstConnectedCallbackMixin} from "./FirstConnectedCallbackMixin.js"


const listeners = new EventListenerRegistry();

const addEventListenerOG = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, listener) {
  addEventListenerOG.call(this, type, listener);     //todo make this into a regular purish function again
  listeners.add(this, type, listener);
};

const removeEventListenerOG = EventTarget.prototype.removeEventListener;
EventTarget.prototype.removeEventListener = function (type, listener) {
  removeEventListenerOG.call(this, type, listener);  //todo make this into a regular purish function again
  listeners.remove(this, type, listener);
};

// EVENT PROPAGATION
const eventStack = [];

function propagateEvent(el) {
  const e = convertElementToEvent(el);

  if (e.eventPhase !== Event.NONE)
    throw new Error("Cannot dispatch the same Event twice.");

  let root = el.getAttribute(':root');
  if (root === 'true') root === true;
  else if (root === 'false') root === false;
  else if (root) root === document.querySelector(`[\\:uid=${root}]`);
  //todo deep querySelector? //todo patch the querySelector(..) to enable deep queries for uids?
  root = calculateRoot(this, root, e);
  let innermostTarget = this;
  const composedPathIn = composedPath(this, root);
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


function runTimer(el) {
  let cb = el.cb || window[el.getAttribute(":cb")] //todo add new
  if (!cb) return
  let res = cb.call(el);
  return res;
}


class EventLoop extends FirstConnectedCallbackMixin {
  constructor() {
    super();
    document.addEventListener('DOMContentLoaded', () => {    //todo: add new
      if (document.readyState === "loading") return;
      this.setAttribute(":now", Date.now());
      this.findNextTask();
    });
  }

  firstConnectedCallback() {
    this.active = false;
    this.timer = 0;
    const mo = new MutationObserver(mr => {
      if (this.active || !mr[0].addedNodes.length)
        return;
      this.active = true;
      // if (this.hasAttribute(':macro'))
      //   setTimeoutOG(() => this.findNextTask());
      // else
      this.findNextTask();
    });
    mo.observe(this, {childList: true});
    //todo throw error if there are two event-loop elements in the DOM at the same time?
    //todo throw error if this element is not either a direct child of either head or body element?
  }


  convertArguments(timeoutElement, data) {
    let args = [...timeoutElement.children].map(child => {
      let textContent = child.textContent;
      let dataType = child.tagName;
      //3. process <str, <json, <int, <boolean, <float, <el>
      if (dataType === 'TASK') {
        textContent = child.getAttribute(':res');
        dataType = child.getAttribute(':res-type');
        if (!dataType) return console.warn(":res attribute specified without :res-type attribute in ", child)
      }
      if (dataType === 'STR')
        return textContent;
      if (dataType === 'JSON')
        return JSON.parse(textContent);
      if (dataType === 'INT')
        return Number.parseInt(textContent);
      if (dataType === 'BOOLEAN')
        return JSON.parse(textContent);
      if (dataType === 'FLOAT')
        return Number.parseFloat(textContent);
    });
    return args;
  }

  interpretTask(timeoutElement) {
    let cb;
    if (timeoutElement.getAttribute(":cb"))
      cb = window[timeoutElement.getAttribute(":cb")];
    const args = this.convertArguments(timeoutElement);
    if (!cb) return;
    let res = cb.call(null, args);
    if (!res) return timeoutElement.getAttribute(":res");
    timeoutElement.setAttribute(":res-type", timeoutElement.lastElementChild.tagName);
    return res;
  }

  finishTask(currentTask, data) {
    currentTask.setAttribute(":res", data);  //todo:   we have to set it inside interpretTask function to avoid infinitive loop
    currentTask.setAttribute(":finished", Date.now());                            //todo: step 2
    return this.findNextTask();
  }

  findNextTask() {
    const eventLoop = document.querySelector("event-loop");
    const waitingEvent = document.querySelector('event-loop > event[\\:on]:nth-last-child(1)');
    if (waitingEvent)
      this.runTask(waitingEvent);
    let nonResolvedTask = [...document.querySelectorAll('task:not([\\:started]')].filter(task =>
      !task.hasAttribute(":started") && !task.children.length ||
      !task.hasAttribute(":res") && !![...task.children].filter(
      c => !c.hasAttribute(":res") &&  c.getAttribute(":start") > eventLoop.getAttribute(
        ":now")).length).pop();
    if (!nonResolvedTask)
       return this.active = false;
    const timeToWait = (parseInt(nonResolvedTask.getAttribute(':start')) || 0) - new Date().getTime();
    if (timeToWait <= 0) {
      this.runTask(nonResolvedTask);
    } else {
      this.timer = setTimeoutOG(() => this.findNextTask(), timeToWait);
      this.active = false;
    }
    setTimeoutOG(this.findNextTask.bind(this));
  }

  runTask(unresolvedTask) {
    this.active = true;
    if (this.timer)
      clearTimeout(this.timer);
    this.timer = 0;
    if (!unresolvedTask)
      return this.active = false;
    if (unresolvedTask?.tagName === "EVENT")
      propagateEvent(unresolvedTask);
    else {
        unresolvedTask.setAttribute(":started", Date.now());
        let res = unresolvedTask.children?.length ? this.interpretTask(unresolvedTask) : runTimer(unresolvedTask);
        //todo: Should I replace Promise.then() to await ??
        typeof res?.then === 'function' ? res.then(data => {
          this.finishTask(unresolvedTask, data)
        }) : this.finishTask(unresolvedTask, res);
        let isAsync = !unresolvedTask.getAttribute(":res");
        let startedTimestamp = unresolvedTask.getAttribute(":started");
        // if it has :started, but no :res, then it is :async-started.
        if (isAsync && startedTimestamp) {
          unresolvedTask.removeAttribute(":started");
          unresolvedTask.setAttribute(":async-started", startedTimestamp)
        }
        // if it has :res, then it is :finished :async-finished.  //todo: problem with promise I think. Recursive overwrite 'unresolvedTask'
        if (isAsync)
          unresolvedTask.setAttribute(":async-finished", Date.now()); //todo: Date.now() ??
    }
  }
}

customElements.define('event-loop', EventLoop);

function convertElementToEvent(el) {
  if (el.original)
    return el.original;
  const e = new Event(el.getAttribute(':type'));
  e.timeStamp = el.getAttribute(':time-stamp');
  el.hasAttribute(':default-prevented') && e.preventDefault();
  return e;
}

function makeEventElement(e, root) {
  const el = document.createElement('event');
  el.original = e;
  el.setAttributeNode(document.createAttribute(':on'));
  el.setAttribute(':type', e.type);
  el.setAttribute(':time-stamp', e.timeStamp);
  el.setAttribute(':target', e.target?.uid || this.uid); //todo: add new +
  el.setAttribute(':root', root instanceof Node ? root.uid : root);
  e.defaultPrevented && el.setAttributeNode(document.createAttribute(':default-prevented'));
  //todo add the x, y, and other relevant properties for the native events. and the other events.
  //todo use a blacklist to exclude non-relevant properties?
  return el;
}


function makeTaskElement(cb, ms = 0) {   //todo: +1
  const el = document.createElement('task');      //todo: +1
   el.setAttribute(":created", Date.now());    //todo: step 1
  el.setAttribute(":delay", ms);
  el.setAttribute(":start", Date.now() + ms);  //todo: +1
  const name = cb.name;
  if (window[name]) {         //todo: add new +
    el.setAttribute(':cb', name);
    el.cb = cb;
    return el;
  } else {
    name ? console.warn("Unable to add local function", name, "to", el) :
      console.warn("Unable to add an anonymous function to", el)
  }
}

const setTimeoutOG = window.setTimeout;
window.setTimeout = function setTimeout(cb, ms) {
  const timeoutElement = makeTaskElement(cb, ms);                                   //todo: +1
  timeoutElement && document.querySelector("event-loop").prepend(timeoutElement);
};

const dispatchEventOG = EventTarget.prototype.dispatchEvent;
Object.defineProperty(EventTarget.prototype, 'dispatchEvent', {
  value: function (e, root) {
    document.querySelector("event-loop").prepend(makeEventElement(e, root));
  }
});


