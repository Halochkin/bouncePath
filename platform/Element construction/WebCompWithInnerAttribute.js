class InnerComp extends HTMLElement {
  constructor() {
    super();
    this.isNew = new.target;
  }

  static get observedAttributes() {
    return ["a"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log(this, this.isNew);
  }
}

customElements.define('inner-comp', InnerComp);

class WebComp extends HTMLElement {
  constructor() {
    super();
    console.log(this, new.target);
  }

  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
  }

  static get observedAttributes() {
    return ["a"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const inner = new InnerComp();
    inner.setAttribute(name, newValue);
  }
}

customElements.define('web-comp', WebComp);