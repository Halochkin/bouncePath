/*
1. CloneNode must iterate deep and remove any id attribute. //todo
*/

const getAttributeOG = Element.prototype.getAttribute;
const cloneNodeOG = Element.prototype.cloneNode;

function produceUniqueID(element) {
  let res = [];
  let rootNode = element.getRootNode({composed: false});
  let idMinValue = rootNode.childNodes.length;
  const allID = [...rootNode.querySelectorAll('*[id]')].map(
    element => res.push(getAttributeOG.call(element, "id")));
  let newId = Math.floor(Math.random() * (idMinValue + 1) + idMinValue * 2);
  while (allID.includes(newId)) {
    newId = Math.floor(Math.random() * (idMinValue + 1) + idMinValue * 2);
  }
  return newId;
}

Object.defineProperties(Element.prototype, {
  // The get/set .id property just points to the id attribute.
  "id": {
    /* If you try to get id, and the element is in the document, then a counter is used to produce an id, and then that
       is set and returned.*/
    get: function () {
      let definedAttr = getAttributeOG.call(this, "id");
      if (!(this.getRootNode({composed: false}) === document))
        return definedAttr;
      let newId = produceUniqueID(this);
      this.setAttributeNode("id", newId);
      return newId;
    },
    set: function (newValue) {
      /* If you try to set id, and the id value is already set, and the id value is unique in the document, then you get
          a warning and no error is set. */
      if (typeof newValue === "number") newValue = newValue.toString();
      const isAttributeSet = getAttributeOG.call(this, "id");
      const idList = [];
      const elementsWithID = [...this.getRootNode({composed: false}).querySelectorAll('*[id]')].map(
        element => idList.push(getAttributeOG.call(element, "id")));
      if (elementsWithID.includes(newValue))
        return console.error(`Can't set '${newValue}' as id for`, this, ", such id is already exist "); //todo: fix message
      this.setAttribute("id", newValue);
      console.warn(newValue, " has been set as id of ", this);
      return newValue;
    },
  },

  /* If you try to get id, and the element is in the document, then a counter is used to produce an id, and then that
     is set and returned.
     The getAttribute() is monkeypatched with this logic.  */

  "getAttribute": {
    value: function (value) {
      const idAttributeValue = getAttributeOG.call(this, value);
      if (value !== "id")
        return idAttributeValue;
      //handle id attribute
      if (!(this.getRootNode({composed: false}) === document))
        return getAttributeOG.call(this, "id");
      let newId = produceUniqueID(this);
      return newId;
    }
  },

  "cloneNode": {
    value: function (options) {
      const cloned = cloneNodeOG.call(this, !!options);
      const childList = cloned.children;
      /* CloneNode must iterate deep and remove any id attribute. */
      for (const element of [cloned, ...childList])
        if (element.hasAttribute("id"))
          element.removeAttribute("id")
      return cloned;
    },
  }
})