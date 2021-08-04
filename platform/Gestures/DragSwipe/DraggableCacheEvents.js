import {cacheEventElement} from "../../Events/eventLoop.js";

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
  // pointerup.preventDefault(); //todo: produce an error inside Event.js
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
  // pointerdown.preventDefault(); //todo: produce an error inside Event.js
  // pointermove.preventDefault(); //todo: produce an error inside Event.js
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


 export class DragMaybe extends HTMLElement {
  firstConnectedCallback() {
    this.addEventListener('pointerdown', maybeDragListener, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}

export class DragMaybeReaction extends HTMLElement {
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

export class DraggingReaction extends HTMLElement {
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