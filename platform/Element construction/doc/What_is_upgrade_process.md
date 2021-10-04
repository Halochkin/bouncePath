# WhatIs: upgrade process

The upgrade process is the process that triggers callbacks to the custom element lifecycle after it has been defined with `customElements.define()`. 

```html
<element-a></element-a>
<Script>customElements.define("element-a",AElement)</script>
```

Because custom elements registered by the script with `customElements.define()`, they can be declared or created before 
their definition is registered by the browser. For example, it is possible to declare `<my-element>` on the page, but end up calling
 `customElements.define('my-element', ClassName)` much later.


When the browser creates HTMLUnknownElement for a tag 'element-a', and then *after* that, a script calls `customElements.define('element-a', ...)`,
 the browser will do a very special procedure called "upgrade". The "upgrade" procedure will call the `constructor()`, 
 the `attributeChangedCallback()` and *always* the `connectedCallback()` on the `HTMLUnknownElement`.

This is weird. First, the browser does something in JS land that *never, ever* happens elsewhere: it calls a  `constructor()`
 on an already created object. It would look something like this if you could see the code: 
 
 ```javascript
 ElementA.constructor.call(htmlUnknownElementObjectInstance);  
```
 Calling a constructor on an already instantiated object is 100% forbidden in normal JS script; it is only the browser that
does this internally when "upgrading" custom elements. Second, the browser *only* upgrades elements that are connected to the main document.
That is why during the upgrade process you will *always* get a `connectedCallback()` too. So, if you have an `HTMLUnknownElement()` for `<element-a>`
in JS memory only (you have created it using document.createElement(`element-a`) and not yet connected it), then the "upgrade process"
will be called on that element at the moment you append it (directly or indirectly) to the main DOM.

```html
<a-element a></a-element>

<script>
  class ElementA extends HTMLElement {
    constructor() {
      super();
      console.log(Date.now(), 'constructor A')
    }

    connectedCallback() {
      console.log(Date.now(), "connectedCallback A");
    }

    static get observedAttributes() {
      return ["a"]
    }

    attributeChangedCallback(value, oldValue, newValue) {
      console.log(Date.now(), "attributeChangedCallback A");
    }
  }

customElements.define("a-element", ElementA);
</script>
// constructor A
// attributeChangedCallback A
// connectedCallback A
```