/* this file is used to check that no elements are adopted. We recommend using this plugin during devleopment, and then
 take it out during production when you are confident that no elements/nodes are adopted between document/DocumentFragments.
*/

const usedElements = new WeakSet();

function checkRootNode(target, newChild, original) {
  usedElements.has(newChild) ?
    console.warn("a child cannot be adopted a second time") :
    usedElements.add(newChild);
  const targetRoot = target.getRootNode({composed: false});
  const newChildRoot = newChild.getRootNode({composed: false});
  if (newChildRoot instanceof DocumentFragment && targetRoot === newChildRoot)
    console.warn("new child rootNode is illegal")
  else original.call(target, newChild);
}

const appendChildOG = Element.prototype.appendChild; //inherited from Node
const insertBeforeOG = Element.prototype.insertBefore;
const appendOG = Element.prototype.append;
const prependOG = Element.prototype.prepend;
const removeOG = Element.prototype.remove;
const DocumentFragmentAppendOG = DocumentFragment.prototype.append;
const DocumentFragmentPrependOG = DocumentFragment.prototype.prepend;

Object.defineProperties(Element.prototype, {
  "appendChild": {
    value: function (element) {
      return checkRootNode(this, element, appendChildOG);
    }
  },
  "insertBefore": {
    value: function (element) {
      return checkRootNode(this, element, insertBeforeOG);
    }
  },
  "append": {
    value: function (element) {
      return checkRootNode(this, element, appendOG);
    }
  },
  "prepend": {
    value: function (element) {
      return checkRootNode(this, element, prependOG);
    }
  },
  "remove": function (element) {
    return checkRootNode(this, element, removeOG);
  }
});

Object.defineProperties(DocumentFragment.prototype, {
  "append": {
    value: function (element) {
      return checkRootNode(this, element, DocumentFragmentAppendOG);
    }
  },
  "prepend": {
    value: function (element) {
      return checkRootNode(this, element, DocumentFragmentPrependOG);
    }
  }
})


