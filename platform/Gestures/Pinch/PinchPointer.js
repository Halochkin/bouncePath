window.EventListenerOptions = Object.assign(window.EventListenerOptions || {}, {
  PREVENTABLE_NONE: 0,   // the listener is not blocked by preventDefault, nor does it trigger preventDefault.     //this is the same as passive: true
  PREVENTABLE_SOFT: 1,   // the listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        // the listener is blocked by preventDefault, and will always call preventDefault when invoked.
});


class PinchEvent extends PointerEvent {
  constructor(type, dict) {
    super(type, dict);
  }


  static tryToMakePinch(pointerdown, pointermove) {

    const calcAngle = (x = 0, y = 0) => ((Math.atan2(y, -x) * 180 / Math.PI) + 270) % 360;

    const point1Initial = evCache[0];
    const point2Initial = evCache[1];


    const x1Initial = point1Initial.pageX;
    const x2Initial = point2Initial.pageX;

    const y1Initial = point1Initial.pageY;
    const y2Initial = point2Initial.pageY;

    const widthInitial = Math.abs(x2Initial - x1Initial);
    const heightInitial = Math.abs(y2Initial - y1Initial);

    const point1Last = evCache[evCache.length - 1];
    const point2Last = evCache[evCache.length - 2];

    const x1Last = point1Last.pageX;
    const y1Last = point1Last.pageY;

    const x2Last = point2Last.pageX;
    const y2Last = point2Last.pageY;

    const distXLast = Math.abs(x2Last - x1Last);
    const distYLast = Math.abs(y2Last - y1Last);

    const diagonalInitial = Math.sqrt(widthInitial * widthInitial + heightInitial * heightInitial);
    const diagonalLast = Math.sqrt(distXLast * distXLast + distYLast * distYLast);

    const angleInitial = calcAngle(x1Initial - x2Initial, y1Initial - y2Initial);
    const angleLast = calcAngle(x1Last - x2Last, y1Last - y2Last);
    const rotation = angleLast - angleInitial.toFixed(3);


    if ((Math.abs(diagonalInitial) - Math.abs(diagonalLast)) < 10)
      return new PinchEvent("pinch", pointermove)
  }

}

const pseudo = Math.random() + 1;  //this should probably be exportable.
let userSelectOG, target, pointerdown, lastPinchEvent; //global state

function cancelPinchMaybe() {
  if (!target)
    return;
  target.removeAttribute(':pinch-maybe', pseudo);
  userSelectOG = pointerdown = target = undefined;
}

function cancelPinch(e) {
  if (!target)
    return;
  target.dispatchEvent(new PinchEvent('pinch-cancel', lastPinchEvent));
  target.removeAttribute(':pinch', pseudo);
  target.style.userSelect = userSelectOG;
  lastPinchEvent = userSelectOG = pointerdown = target = undefined;
  evCache = [];
}

function endPinch(pointerup) {
  pointerup.preventDefault();
  target.dispatchEvent(new DragEvent('pinch-end', pointerup));
  target.removeAttribute(':pinch', pseudo);
  target.style.userSelect = userSelectOG;
  lastPinchEvent = userSelectOG = pointerdown = target = undefined;

  // Remove this event from the target's cache
  for (var i = 0; i < evCache.length; i++) {
    if (evCache[i].pointerId == pointerup.pointerId) {
      evCache.splice(i, 1);
      break;
    }
  }
}


let evCache = new Array();

function maybePinchListener(e) {

  evCache.push(e);

  // Find this event in the cache and update its record with this event
  for (var i = 0; i < evCache.length; i++) {
    if (e.pointerId == evCache[i].pointerId) {
      evCache[i] = e;
      break;
    }
  }

  if (evCache.length < 2)
    return;

  pointerdown = e;
  target = this;
  userSelectOG = target.style.userSelect;
  target.style.userSelect = 'none';
  target.setAttributeNode(document.createAttribute(':pinch-maybe'), pseudo);
}

function tryToPinch(pointermove) {
  if (pointermove.defaultPrevented)
    return this.cancelPinchMaybe();
  lastPinchEvent = PinchEvent.tryToMakePinch(pointerdown, pointermove);

  if (!lastPinchEvent)
    return;

  pointerdown.preventDefault();
  pointermove.preventDefault();
  target.removeAttribute(':pinch-maybe', pseudo);
  target.setAttributeNode(document.createAttribute(':pinch'), pseudo);
  target.dispatchEvent(new PinchEvent('pinch-start', pointerdown));
  target.dispatchEvent(lastPinchEvent);
}

function pointermoveToPinch(pointermove) {
  const evt = new PinchEvent('pinch-move', pointerdown);
  target.dispatchEvent(evt);
}


export class PinchMaybe extends HTMLElement {
  firstConnectedCallback() {
    this.addEventListener('pointerdown', maybePinchListener, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}

export class PinchMaybeReaction extends HTMLElement {

  static get observedAttributes() {
    return [":pinch-maybe"];
  }

  cancelPinchMaybe() {
    this === target && cancelPinchMaybe();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === null) {
      window.removeEventListener('pointerup', cancelPinchMaybe, true);
      window.removeEventListener('pointermove', tryToPinch, true);
      window.removeEventListener('pointerdown', cancelPinchMaybe, true);
      window.removeEventListener('blur', cancelPinchMaybe, true);
      window.removeEventListener('selectstart', cancelPinchMaybe, true);
    } else {
      window.addEventListener('pointerup', cancelPinchMaybe, true);
      window.addEventListener('pointermove', tryToPinch, true);
      window.addEventListener('pointerdown', cancelPinchMaybe, true);
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
      window.removeEventListener('pointermove', pointermoveToPinch, true);
      window.removeEventListener('pointerup', endPinch, true);
      window.removeEventListener('pointerdown', cancelPinch, true);
      window.removeEventListener('blur', cancelPinch, true);
      window.removeEventListener('selectstart', cancelPinch, true);
    } else {
      window.addEventListener('pointermove', pointermoveToPinch, true);
      window.addEventListener('pointerup', endPinch, true);
      window.addEventListener('pointerdown', cancelPinch, true);
      window.addEventListener('blur', cancelPinch, true);
      window.addEventListener('selectstart', cancelPinch, true);
    }
  }
}


