import {} from "../CustomElementsMix.js"

let testString = "";
let contextA;
let contextB;

class mixinA extends HTMLElement {

  // replace to firstAdoptedCllback() ???

  connectedCallback() {
    testString += "a";
    contextA = this;
  }


}

class mixinB extends HTMLSpanElement {

  connectedCallback() {
    testString += "b";
    contextB = this;
  }
}

class mixinC extends HTMLDivElement {
  connectedCallback() {
    testString += "c";
  }
}

class mixinD extends HTMLElement {

  connectedCallback() {
    testString += "d";
  }
}

class mixinBACC extends HTMLElement {

  static get observedAttributes() {
    return ["hello"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    testString += "bACC";
  }
}


class mixinAACC extends HTMLElement {
  static get observedAttributes() {
    return ["hello"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    testString += "aACC";
  }
}


//todo: parent inheritance without super()

class parentClass extends HTMLElement {

  customCallback() {
     return testString += "parent"
  }
}

class childClass extends parentClass {


}



class nonExtend {

  customCallback() {
    alert("boo")
  }
}

class nonExtendChild extends nonExtend {

  customCallback() {
    alert("ooops")
  }
}


describe("basic tests", function () {
  it("Defined properties values", function () {
    customElements.mix("a-b-property", [mixinA, mixinB]);
    const element = document.createElement("a-b-property");
    document.body.appendChild(element);
    let propertiesA = Object.getOwnPropertyDescriptors(contextA.constructor);
    let propertiesB = Object.getOwnPropertyDescriptors(contextB.constructor);
    expect(propertiesA.name.value).to.be.equals("ABProperty");
    expect(propertiesB.name.value).to.be.equals("ABProperty");
  });

  it("Running the callback in reverse order", function () {
    testString = "";
    customElements.mix("a-b-reverse-combo", [mixinA, mixinB]);
    const element = document.createElement("a-b-reverse-combo");
    document.body.appendChild(element);
    expect(testString).to.be.equals("ba");
  });

  it('Combine two components', function () {
    testString = "";
    customElements.mix("a-b-combo", [mixinA, mixinB]);
    const element = document.createElement("a-b-combo");
    document.body.appendChild(element);
    expect(testString).to.be.equals("ba");
  });

  it('Combine three components', function () {
    testString = "";
    customElements.mix("a-b-c-combo", [mixinA, mixinB, mixinC]);
    const element = document.createElement("a-b-c-combo");
    document.body.appendChild(element);
    expect(testString).to.be.equals("cba");
  });

  it('Combine the same component', function () {
    testString = "";
    customElements.mix("a-a-combo", [mixinA, mixinA]);
    const element = document.createElement("a-a-combo");
    document.body.appendChild(element);
    expect(testString).to.be.equals("aa");
  });

  it('Combine one component which extend HTMLSpanElement', function () {
    testString = "";
    customElements.mix("b-combo", [mixinB]);
    const element = document.createElement("b-combo");
    document.body.appendChild(element);
    expect(testString).to.be.equals("b");
  });

  it("Component extend another component", function () {
    testString = "";
    customElements.mix("cc-cc-combo", [mixinA, childClass]);
    const element = document.createElement("cc-cc-combo");
    element.customCallback();  //call parent method
    document.body.appendChild(element);
    expect(testString).to.be.equals("a");
  })
})


describe(" mix() AttributeChangedCallback", function () {

  it("Both components with AttributeChangedCallback() and observedAttributes()", function () {
    testString = "";
    customElements.mix("acc-bcc-combo", [mixinAACC, mixinBACC]);
    const element = document.createElement("acc-bcc-combo");
    document.body.appendChild(element);
    element.setAttribute("hello", "world");
    // element.setAttribute("hello", "sunshine");
    expect(testString).to.be.equals("bACCaACC");
  });


  it("One components with AttributeChangedCallback() and observedAttributes() another without", function () {
    testString = "";
    customElements.mix("acc-b-combo", [mixinAACC, mixinB])
    const element = document.createElement("acc-b-combo");
    // element.setAttribute("hello", "world");
    document.body.appendChild(element);
    element.setAttribute("hello", "sunshine");
    expect(testString).to.be.equals("baACC");
  });


  it("Change attributes several times, both components with AttributeChangedCallback() and observedAttributes() ",
    function () {
      testString = "";
      customElements.mix("acc-bcc-combo-2", [mixinAACC, mixinBACC])
      const element = document.createElement("acc-bcc-combo-2");
      element.setAttribute("hello", "world");
      element.setAttribute("hello", "sky");
      document.body.appendChild(element);
      element.setAttribute("hello", "sunshine");
      expect(testString).to.be.equals("bACCaACCbACCaACCbACCaACC");
    });

})

describe("Error tests", function () {
  it("Custom element сlass does not extend HTMLElement", function () {
    try {
      customElements.mix("a-n-combo", [nonExtend, mixinC])
      const element = document.createElement("a-n-combo");
      document.body.appendChild(element);
    } catch (e) {
      expect(e.message).to.be.equals(
        `ElementMixins must be a direct descendant on HTMLElement, ie. "nonExtend extends HTMLElement".`);
    }
  });


  it("Custom element class extend HTMLElement which does not", function () {
    try {
      customElements.mix("a-nn-combo", [nonExtendChild, mixinA])
      const element = document.createElement("a-nn-combo");
      document.body.appendChild(element);
    } catch (e) {
      expect(e.message).to.be.equals(
        `ElementMixins must be a direct descendant on HTMLElement, ie. "nonExtendChild extends HTMLElement".`);
    }
  });
})


//combined mixins name by tagname  +
// callbacks tests
//attributeChangedCallback vs connectedCallback vs customCallback
// get callback properties +
//mixed class properties  +
// observedAttributes test
// no constructor  +
// several elements +
// extend another class +






