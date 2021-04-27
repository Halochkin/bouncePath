import {} from "../../src/HTMLElementNative.js";


class OuterHost extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = '<upper-inner-link-slot><inner-link-slot><inner-host></inner-host></inner-link-slot></upper-inner-link-slot>';
  }
}

class InnerHost extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<h1>hello sunshine</h1>';
  }
}

class LinkSlot extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<frame-slot><slot></slot></frame-slot>';
  }
}

class FrameSlot extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<slot></slot>';
  }
}

class InnerLinkSlot extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<inner-frame-slot><slot></slot></inner-frame-slot>';
  }
}

class InnerFrameSlot extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<slot></slot>';
  }
}

class UpperInnerLinkSlot extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<upper-inner-frame-slot><slot></slot></upper-inner-frame-slot>';
  }
}

class UpperInnerFrameSlot extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<slot></slot>';
  }
}

customElements.define("outer-host", OuterHost);
customElements.define("inner-host", InnerHost);
customElements.define("link-slot", LinkSlot);
customElements.define("frame-slot", FrameSlot);
customElements.define("inner-link-slot", InnerLinkSlot);
customElements.define("inner-frame-slot", InnerFrameSlot);
customElements.define("upper-inner-link-slot", UpperInnerLinkSlot);
customElements.define("upper-inner-frame-slot", UpperInnerFrameSlot);


const div = document.createElement("div");
const span = document.createElement("span");
const h2 = document.createElement("h2");
const linkSlot = document.createElement("link-slot");
const outerHost = document.createElement("outer-host");
const mostNestedH1 = outerHost.shadowRoot.children[0].children[0].children[0].shadowRoot.children[0].shadowRoot;

document.body.prepend(div)
div.appendChild(linkSlot);
linkSlot.appendChild(span);
span.appendChild(outerHost);
linkSlot.appendChild(h2);