let oneHit = false;


class PinchEvent extends TouchEvent {
  constructor(type, dict) {
    super(type, dict);
  }


  static tryToMakePinch(touchdown, touchmove) {

    const f1Initial = touchdown.targetTouches[0];
    const f2Initial = touchdown.targetTouches[1];
    const x1Initial = f1Initial.pageX;
    const y1Initial = f1Initial.pageY;
    const x2Initial = f2Initial.pageX;
    const y2Initial = f2Initial.pageY;

    const widthInitial = Math.abs(x2Initial - x1Initial);
    const heightInitial = Math.abs(y2Initial - y1Initial);
    const diagonalInitial = Math.sqrt(widthInitial * widthInitial + heightInitial * heightInitial);

    const f1Last = touchmove.targetTouches[0];
    const f2Last = touchmove.targetTouches[1];
    const x1Last = f1Last.pageX;
    const y1Last = f1Last.pageY;
    const x2Last = f2Last.pageX;
    const y2Last = f2Last.pageY;

    const widthLast = Math.abs(x2Last - x1Last);
    const heightLast = Math.abs(y2Last - y1Last);
    const diagonalLast = Math.sqrt(widthLast * widthLast + heightLast * heightLast);

    if ((Math.abs(diagonalInitial) - Math.abs(diagonalLast)) < 10)
      return new PinchEvent("pinch", touchmove);
  }

}

const pseudo = Math.random() + 1;  //this should probably be exportable.
let userSelectOG, target, touchstart, lastPinchEvent; //global state

function cancelPinchMaybe() {
  target.removeAttribute(':pinch-maybe', pseudo);
  userSelectOG = touchstart = target = undefined;
}

function cancelPinch() {
  target.dispatchEvent(new PinchEvent('pinch-cancel', lastPinchEvent));
  target.removeAttribute(':pinch', pseudo);
  target.style.userSelect = userSelectOG;
  lastPinchEvent = userSelectOG = touchstart = target = undefined;
}

function endPinch(touchend) {
  touchend.preventDefault();
  target.dispatchEvent(new DragEvent('pinch-end', touchend));
  target.removeAttribute(':pinch', pseudo);
  target.style.userSelect = userSelectOG;
  lastPinchEvent = userSelectOG = touchstart = target = undefined;
}

function maybePinchListener(e) {
  const touches = e.targetTouches.length;
  if (touches !== 2)
    return;
  touchstart = e;
  target = this;
  userSelectOG = target.style.userSelect;
  target.style.userSelect = 'none';
  target.setAttributeNode(document.createAttribute(':pinch-maybe'), pseudo);
}

function tryToPinch(touchmove) {
  if (touchmove.defaultPrevented)
    return this.cancelPinchMaybe();
  lastPinchEvent = PinchEvent.tryToMakePinch(touchmove);
  if (!lastDragEvent)
    return;
  touchstart.preventDefault();
  touchmove.preventDefault();
  target.removeAttribute(':pinch-maybe', pseudo);
  target.setAttributeNode(document.createAttribute(':pinch'), pseudo);
  target.dispatchEvent(new DragEvent('pinch-start', touchstart));
  target.dispatchEvent(lastPinchEvent);
}

function touchmoveToPinch(touchmove) {
  console.log(touchmove)
}

export class PinchMaybe extends HTMLElement {
  firstConnectedCallback() {
    this.addEventListener('mousedown', maybePinchListener, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}

export class PinchMaybeReaction extends HTMLElement {

  static get observedAttribute() {
    return [":pinch-maybe"];
  }

  cancelPinchMaybe() {
    this === target && cancelPinchMaybe();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === null) {
      window.removeEventListener('touchend', cancelPinchMaybe, true);
      window.removeEventListener('touchmove', tryToPinch, true);
      window.removeEventListener('blur', cancelPinchMaybe, true);
      window.removeEventListener('selectstart', cancelPinchMaybe, true);
    } else {
      window.addEventListener('touchend', cancelPinchMaybe, true);
      window.addEventListener('touchmove', tryToPinch, true);
      window.addEventListener('blur', cancelPinchMaybe, true);
      window.addEventListener('selectstart', cancelPinchMaybe, true);
    }
  }
}

export class PinchReaction extends HTMLElement {
  static get observedAttributes() {
    return [":pinch"];
  }

  requestPinchCancel() {
    target === this && cancelPinch();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === null) {
      window.removeEventListener('touchmove', touchmoveToPinch, true);
      window.removeEventListener('touchend', endPinch, true);
      window.removeEventListener('touchstart', cancelPinch, true);
      window.removeEventListener('blur', cancelPinch, true);
      window.removeEventListener('selectstart', cancelPinch, true);
    } else {
      window.addEventListener('touchmove', touchmoveToPinch, true);
      window.addEventListener('touchend', endPinch, true);
      window.addEventListener('touchstart', cancelPinch, true);
      window.addEventListener('blur', cancelPinch, true);
      window.addEventListener('selectstart', cancelPinch, true);
    }
  }
}


