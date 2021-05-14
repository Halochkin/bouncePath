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


function getRelatedTarget(target) {
  let groupName = target.getAttribute('name');
  if (!groupName)
    return target;
  // 1. try to select items :checked
  let groupItems = target.form.querySelectorAll(`[checked][name=${groupName}]`)
  // 2. if no such items and all items are unchecked, select group
  if (!groupItems.length)
    groupItems = target.form.querySelectorAll(`[name=${groupName}]`); //todo: ugly, but if noone item from group does not check as :checked, this means that current target must be relatedTarget
  //if some items marked with :checked (step 1 selector), we defined it as .checked manually inside firstConnectedCallback()
  const isCheckedProperty = groupItems[groupItems.length - 1].checked;
  // If all items was unchecked by default (without :checked)
  // After repeated selection attribute will NOT to be changed (neither removed nor added), but browser must define .checked property on the element. Element can be unchecked but contain :checked
  if (!isCheckedProperty)
    for (const item of groupItems)
      if (item.checked)
        return item;
  // first selection
  return isCheckedProperty ? groupItems[groupItems.length - 1] : target;

}


function clickToChangeRadio() {
  if (this.checked)
    return
  const change = new Event('change', {bubbles: true});
  const relatedTarget = getRelatedTarget(this);
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