/*
1. CloneNode must iterate deep and remove any id attribute. //todo
*/

const getAttributeOG = Element.prototype.getAttribute;

function produceUniqueID(element) {
  let res = [];
  let rootNode = element.getRootNode();
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
      let newId = produceUniqueID(this);
      return getAttributeOG.call(this, "id");
    },
    set: function (newValue) {
      const isAttributeSet = getAttributeOG.call(this, "id");
      const elementsWithID = this.getRootNode().querySelectorAll('*[id]');
      /* If you try to set id, and the id value is already set, and the id value is unique in the document, then you get
         a warning and no error is set. [+] */
      if (isAttributeSet && elementsWithID.length)
        for (const element of elementsWithID) {
          let idValue = getAttributeOG.call(element, "id");
          if (typeof newValue === "number")
            newValue = newValue.toString();
          if (idValue === newValue)  /* set non unique id */
            return console.error(`Can't set '${newValue}' as new value of:`, this, ", such value is already exist ",
              element); //todo: fix message
          if (element === this)
            return getAttributeOG.call(this, "id");
        }
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
      if (idAttributeValue)
        return idAttributeValue;
    }
  }
})