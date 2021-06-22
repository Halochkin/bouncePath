//
/*
* You have a situation: two different elements listen for long-press and swipe for the same inner target.
* Now, both long-press and swipe shouldn't run at the same time, they should be preventDefault-sensitive to each other.
* This means that as soon as one of the gesture mixins switch from maybeObservationMode and to activeTriggeredMode,
* then it should alert the other gesture mixins for touch events that it has activated. It does so, by calling preventDefault()
* on the initial touchstart event that started the maybeObservationMode.
*
* preventDefault on touchstart when it kicks in. When a touch swipe mixin decides that this is a swipe, it needs to call
 touchstartEvent.preventDefault(). This communicates to the other mixins, such as touch-long-press, that also might
 observe this touch sequence, that they do should be blocked. Both such mixins also needs to check for defaultPrevented
 on the touchStartEvent during the initial observation, so that they don't start a second gesture for the same event.
  */


/*
* pointerdown=> :swipe-maybe + longEnough + cancel listener for pointerup + pointerdown + blur/focusout + selectstart ?
* longEnough => grabs by calling preventDefault on the pointerdown, :swipe-maybe => :swipe-start
*               also checks preventDefault on pointerdown to cancel.
*
*
* :swipeMaybe=> cancel/start
*
* rule 1. use preventDefault on the initial trigger event such as pointerdown some time *after* the fact, so to communicate with other gesture mixins.
* rule 2. use :gesture-maybe pseudo attribute to mark the element as having a gesture that is in the maybe state.
* rule 3. trigger secondary event listeners using the maybe-state pseudo attribute.
* */

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
  target.setAttributeNode(document.createAttribute(':drag-maybe'), pseudo);
}

function tryToDrag(pointermove) {
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
}

function pointermoveToDrag(pointermove) {
  console.log(pointermove)
  // pointermove.preventDefault();
  //we are not blocking pointermove events here.. do we want to do that?
  //pointermove.stopImmediatePropagation();    //i don't think that we should block like this...
  // target.dispatchEvent(lastDragEvent = new DragEvent('drag', pointermove));
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
      window.removeEventListener('pointermove', tryToDrag, true);
      window.removeEventListener('pointerup', cancelDragMaybe, true);
      window.removeEventListener('pointerdown', cancelDragMaybe, true);
      window.removeEventListener('blur', cancelDragMaybe, true);
    } else {
      window.addEventListener('mousemove', tryToDrag, true);
      window.addEventListener('pointerup', cancelDragMaybe, true);
      window.addEventListener('pointerdown', cancelDragMaybe, true);
      window.addEventListener('blur', cancelDragMaybe, true);
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
      window.removeEventListener('pointermove', pointermoveToDrag, true);
      window.removeEventListener('pointerup', endDragging, true);
      window.removeEventListener('pointerdown', cancelDragging, true);
      window.removeEventListener('blur', cancelDragging, true);
    } else {
      window.addEventListener('pointermove', pointermoveToDrag, true);
      window.addEventListener('pointerup', endDragging, true);
      window.addEventListener('pointerdown', cancelDragging, true);
      window.addEventListener('blur', cancelDragging, true);
    }
  }
}