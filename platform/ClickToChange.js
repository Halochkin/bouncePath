function clickToChange() {
  this.dispatchEvent(new Event('change', {bubbles: true}));
}

export class TranslateClickToChange extends HTMLElement {

  firstConnectedCallback() {
    this.shadowRoot.addEventListener('click', clickToChange, {
      preventable: EventListenerOptions.PREVENTABLE,
      trustedOnly: true
    });
  }
}

function changeTogglesChecked() {
  this.checked = !this.checked;
}

export class ChangeTogglesChecked extends HTMLElement {
  firstConnectedCallback() {
    this.shadowRoot.addEventListener('change', changeTogglesChecked, {
      preventable: EventListenerOptions.PREVENTABLE,
      trustedOnly: true
    });
  }
}


function defaultChecked(target) {
  let groupName = target.getAttribute('name');
  const groupItems = target.getRootNode().querySelectorAll(`[checked][name=${groupName}]`);
  let relatedTarget = groupItems[groupItems.length - 1]; // last item with "checked" attribute
  const isCheckedProperty = groupItems[groupItems.length - 1].checked;  //browser define .checked to currently checked item.
  // After second selection attribute will not to be changed (neither removed nor added), but browser define .checked property on the element

  // if user click second time querySelector above will return the same item, but browser will remove .checked from it
  if (!isCheckedProperty)  // browser does not add new attributes to the element, it only use .checked attribute, so we need to get all items in the group. Single default checked radioBtns can`t to be changed
    for (const item of target.getRootNode().querySelectorAll(`[name=${groupName}]`)) {
      if (item.checked)
       return item;
    }

  return relatedTarget;
}


function clickToChangeRadio() {
  if (this.checked)
    return this.checked = !this.checked;
  const change = new Event('change', {bubbles: true});
  const relatedTarget = defaultChecked(this);
  if (relatedTarget)
    change.relatedTarget = relatedTarget;
  this.dispatchEvent(change);
}

export class TranslateClickToChangeRadio extends HTMLElement {

  firstConnectedCallback() {
    this.addEventListener('click', clickToChangeRadio, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}

function changeTogglesCheckedRadio(e) {
  e.relatedTarget.checked = false;
  this.checked = true;
  e.relatedTarget?.shadowRoot.lastElementChild.removeAttribute("checked");
  this.shadowRoot?.lastElementChild.setAttributeNode(document.createAttribute("checked"), Math.random() + 1);

}

export class ChangeTogglesCheckedRadio extends HTMLElement {
  firstConnectedCallback() {
    this.addEventListener('change', changeTogglesCheckedRadio, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}