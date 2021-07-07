window.EventListenerOptions = Object.assign(window.EventListenerOptions || {}, {
  PREVENTABLE_NONE: 0,   // the listener is not blocked by preventDefault, nor does it trigger preventDefault.     //this is the same as passive: true
  PREVENTABLE_SOFT: 1,   // the listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        // the listener is blocked by preventDefault, and will always call preventDefault when invoked.
});


class DragEvent extends MouseEvent {
  constructor(type, dict) {
    super(type, dict);
  }

  static tryToMakeDrag(pointerdown, pointermove) {
    const distX = pointermove.x - pointerdown.x;
    const distY = pointermove.y - pointerdown.y;
    console.log(distX, distY);
    if ((distY > 4 || distY < -4) || (distX > 4 || distX < -4))
      return new DragEvent('drag', pointermove);
  }
}

const pseudo = Math.random() + 1;  //this should probably be exportable.
let userSelectOG, target, pointerdown, lastDragEvent; //global state

function cancelDragMaybe() {
  target.removeAttribute(':drag-maybe', pseudo);
  userSelectOG = pointerdown = target = undefined;
}

function cancelDragging() {
  target.dispatchEvent(new DragEvent('drag-cancel', lastDragEvent));
  target.removeAttribute(':dragging', pseudo);
  target.style.userSelect = userSelectOG;
  lastDragEvent = userSelectOG = pointerdown = target = undefined;
}

function endDragging(pointerup) {
  pointerup.preventDefault();
  target.dispatchEvent(new DragEvent('drag-end', pointerup));
  target.removeAttribute(':dragging', pseudo);
  target.style.userSelect = userSelectOG;
  lastDragEvent = userSelectOG = pointerdown = target = undefined;
}

function maybeDragListener(e) {
  if (e.buttons !== 1)
    return;
  pointerdown = e;
  target = this;
  userSelectOG = target.style.userSelect;
  target.style.userSelect = 'none';
  document.body.style.touchAction = 'none';
  target.setAttributeNode(document.createAttribute(':drag-maybe'), pseudo);
  cacheEventElement(e);
}

function tryToDrag(pointermove) {
  if (!pointerdown) return;
  if (pointerdown.defaultPrevented)
    return this.cancelDragMaybe();
  lastDragEvent = DragEvent.tryToMakeDrag(pointerdown, pointermove);
  if (!lastDragEvent)
    return;
  pointerdown.preventDefault();
  pointermove.preventDefault();
  target.removeAttribute(':drag-maybe', pseudo);
  target.setAttributeNode(document.createAttribute(':dragging'), pseudo);
  target.dispatchEvent(new DragEvent('drag-start', pointerdown));
  target.dispatchEvent(lastDragEvent);
  cacheEventElement(pointermove);
}

function pointermoveToDrag(pointermove) {
  console.log(pointermove)
  // pointermove.preventDefault();
  //we are not blocking pointermove events here.. do we want to do that?
  //pointermove.stopImmediatePropagation();    //i don't think that we should block like this...
  // target.dispatchEvent(lastDragEvent = new DragEvent('drag', pointermove));
  cacheEventElement(pointermove);
}

class EventLoop extends HTMLElement {
  constructor() {
    super();
    const config = {
      attributes: true,
      childList: true,
      subtree: true
    };

    const dispatchEventOG = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function (e, options) {
      //todo:
      cacheEventElement(e, this);
      this.dispatchEvent(e, options);
    }
  }
}

const targetArray = [];

class EventElement extends HTMLElement {
  constructor() {
    super();
  }

  set attributes(val) {
    let target = val.target;
    let targetId, index = targetArray.indexOf(target);
    if (index !== -1)
      targetId = index;
    else
      targetArray.push(target), targetId = targetArray.length - 1;
    this.setAttribute("type", val.type);
    this.setAttributeNode(document.createAttribute(":target-" + targetId));
  }
}

function cacheEventElement(e, target) {
  const EventLoopElement = document.querySelector("event-loop");
  let eventElement = new EventElement();
  let currentEvent = document.querySelector("event-element[\\:now]");
  if (currentEvent)
    currentEvent.removeAttribute(":now")
  eventElement.setAttributeNode(document.createAttribute(":now"));
  eventElement.attributes = {target: target, type: e.type};
  EventLoopElement.appendChild(eventElement);
}

 class DragMaybe extends HTMLElement {
  firstConnectedCallback() {
    this.addEventListener('pointerdown', maybeDragListener, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}

 class DragMaybeReaction extends HTMLElement {
  static get observedAttributes() {
    return [":drag-maybe"];
  }

  cancelDragMaybe() {
    this === target && cancelDragMaybe();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === null) {
      document.removeEventListener('pointermove', tryToDrag, true);
      document.removeEventListener('pointerup', cancelDragMaybe, true);
      document.removeEventListener('pointerdown', cancelDragMaybe, true);
      document.removeEventListener('blur', cancelDragMaybe, true);
    } else {
      document.addEventListener('pointermove', tryToDrag, true);
      document.addEventListener('pointerup', cancelDragMaybe, true);
      document.addEventListener('pointerdown', cancelDragMaybe, true);
      document.addEventListener('blur', cancelDragMaybe, true);
    }
  }
}

 class DraggingReaction extends HTMLElement {
  static get observedAttributes() {
    return [":dragging"];
  }

  requestDragCancel() {
    target === this && cancelDragging();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === null) {
      document.removeEventListener('pointermove', pointermoveToDrag, true);
      document.removeEventListener('pointerup', endDragging, true);
      document.removeEventListener('pointerdown', cancelDragging, true);
      document.removeEventListener('blur', cancelDragging, true);
    } else {
      document.addEventListener('pointermove', pointermoveToDrag, true);
      document.addEventListener('pointerup', endDragging, true);
      document.addEventListener('pointerdown', cancelDragging, true);
      document.addEventListener('blur', cancelDragging, true);
    }
  }
}