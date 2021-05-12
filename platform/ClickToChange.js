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

function clickToChangeRadio() {
  if(this.checked)
    return;
  const change = new Event('change', {bubbles: true});
  let groupName = this.getAttribute('name');
  change.relatedTarget = this.getRootNode().querySelector('[:checked]' + groupName ? `[name=${groupName}]`: "");
  this.dispatchEvent(change);
}

export class TranslateClickToChangeRadio extends HTMLElement {

  firstConnectedCallback() {
    this.shadowRoot.addEventListener('click', clickToChangeRadio, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}

function changeTogglesCheckedRadio(e) {
  e.relatedTarget.checked = false;
  this.checked = true;
}

export class ChangeTogglesCheckedRadio extends HTMLElement {
  firstConnectedCallback() {
    this.shadowRoot.addEventListener('change', changeTogglesCheckedRadio, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}