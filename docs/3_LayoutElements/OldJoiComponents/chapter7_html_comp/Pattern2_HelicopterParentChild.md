# Pattern: HelicopterParentChild (`<OL>`+`<LI>`)

> One secret about the HelicopterParentChild, which all helicopter children know and all helicopter parents blissfully ignore, is that the responsibility for "looking after" is reversed. The parent is not observing its children. It can go look for them, when triggered, but it doesn't look at them while they move around. It is the child who is responsible for making sure that the parent is triggered at the right time when it moves around. This feels wrong, especially in code. It is the parent who is supposed to observe all its children and register whem they move in and out of their purview. But it is the child who monitors the path to its parent, and make sure to do the appropriate action when this path changes/is broken.
>
> The problem of delegation. The ol+li is not as problematic as the form+input relationship, as the elements can be layered many layers deep. This resemble the real world helicopter parents better too, as the parent delegate to a number of middle men to raise their children. The parent gives the child to the au pair who gives the child to the director of the kindergarten who gives the child to the temp worker in the kindergarten: form > div > span > input. The helicopter parent delegates, and by doing so it becomes just a service provider, not a steady observer.

The HelicopterParentChild pattern is used to create custom HTML collections (lists). 
These collections need to do something more than what the default HTML list provide:
1. **change one or several children elements** based on either their position in the group or group size, 
2. **customize the space** between each element, and/or
3. **input data as an array**.

When a parent element needs to *change* something in a child element,
the two elements quickly develop tight bindings.                                               
The parent might need to change either style, content, attributes, properties, call some method, etc. 
Such changes quickly become very messy if the boundaries of the child are not respected.
Therefore, whenever a HelicopterParent element needs to adapt some properties in or around its children,
a custom element type should also be created for the child element: a HelicopterChild.

So, a HelicopterParent should always have a HelicopterChild. If not, the HelicopterParent will 
hover around and make changes to all kinds of other children elements with unknown and potentially
catastrophic effects. I repeat: do not allow a HelicopterParent to fly around and interfere freely;
always pair the HelicopterParent with a HelicopterChild that has developed techniques and builtin methods 
to handle and *mainly contain* the well-meaning, but meddling parental interference.

The HelicopterParentChild pattern usefulness increases with:
1. the complexity of custom functionality of the parent or child (UIX, event handling, etc.),
2. the quantity of template and/or style in parent or child, or
3. special case treatment of different children based on their content, type and/or position in the collection.

((HTML collections that handles a group of items (children) *of predefined quantity* can use named slots.))

## Example 1: custom OL + LI
In this example we look at a HelicopterParent that needs to *change one or more children elements based on 
their position in the group*.
When making the HelicopterParent element, I use the [SlotchangeMixin](../../../../../JoiComponents/trash/book/Old_Mixin2_SlotchangeMixin.md) to 
a) simplify the act of listening for dynamic changes to the DOM, and 
b) process slotted items on par with normal items.

### Defining two custom element types
```javascript
import {SlotchangeMixin} from "SlottableMixin.js"; 

class OlWc extends SlotchangeMixin(HTMLElement) {
                                                                                
  connectedCallback() {                                           
    super.connectedCallback();
    this.style.paddingLeft = "20px";
    this.style.display = "block";
  }
  slotchangedCallback(slot, newNodes, oldNodes) {     //[2]
    newNodes
      .filter(item => item instanceof LiWc)
      .forEach((el, i) => el.updateNumber(i + 1));
  }
}

class LiWc extends HTMLElement {

  connectedCallback() {
    super.connectedCallback();
    this.attachShadow({ mode: "open" });
    this.style.display = "inherit";                      
    this.shadowRoot.innerHTML = `<span>#.</span><slot></slot>`;   //[1]
  }
  updateNumber(num) {                                             
    this.shadowRoot.children[0].innerText = num + ". ";           //[3]
  }
}

customElements.define("ol-wc", OlWc);
customElements.define("li-wc", LiWc);
```
1. The LiWc item element (LI) sets up a default shadowDom in which the number of the LI element thus far
is unspecified (`#. `).
2. When the OL is first connected, or whenever the list of visible children changes, 
the `slotchangedCallback(...)` is triggered. This method iterates the list of children 
and notifies all LI children about their LI-only order in the list by calling `el.updateNumber(i+1)`.
3. When the LI element is notified about an updated position in its list, 
it updates it shadowDom to display that position.

### Using two custom element types
The OlWc container element (OL) can contain several LiWc item elements (LI) as children.
These elements can be added in the template (as in the example below), added dynamically via 
`querySelector("ol-wc"").appendChild(newLiChild)`, or as a slot inside another custom element.
```
<ol-wc>
  <li-wc>one</li-wc>
  <li-wc>two</li-wc>
  <li-wc>three</li-wc>
</ol-wc>
```
Which looks like so:

```text
  1. one
  2. two
  3. three
```
[Custom Ol Li example on codepen.io](https://codepen.io/orstavik/pen/KoeLme).

## Example 2: custom columns
In this example we look at a HelicopterParent that needs to *customize the space between each element*.
The example is a custom collection of columns with a border between them:
1. making a grid in the parent container, 
2. adding a left border on all the children items, and
3. hiding the left border only on the first item inside the container at all times.

[Custom column example on codepen.io](https://codepen.io/orstavik/pen/BrPKNp).

## Example 3: input data array
Some elements rely on extensive input data that is:
* not intended to be visible on screen and therefore 
* normally would be passed in as an attribute, but that 
* takes the form of an array/list and therefore does not fit as an attribute. 

To solve this use-case, the [input array data could be passed into the element as JSON](../chapter1/Pattern6_AttributeReaction.md).
If the input values is a list of say 5 numbers, this approach is fine.
However, if the input values is an array of urls, a JSONified array of long strings will be both 
too long and too convoluted to properly read and manage.
In such instances, it is better to pass the input data as child elements.
By setting up this relationship as a HelicopterParentChild using the same convention as
the standard HTML elements `<select>`+`<option>` and `<video>`+`<source>`.
Here, the HelicopterParentChild gives an ergonomic structure both inside the element implementation 
and a clear, readable structure in the use template.

<!-- todo add Example-->

## The allure of a generalized HelicopterParent
Still, the desire to avoid a custom child type and create a generalized HelicopterParent element 
might still haunt you. You want it. You want it bad. To try to help you avoid the frustration, annoyance,
and heartbreak that result from trying to make a generalized HelicopterParent, 
I will here describe some of the problems of applying a HelicopterParent on another "unkowning" element.

The HelicopterParent needs to change something of the child element.
If the HelicopterParent needs to change the DOM around the element, it has no other recourse than 
to change the lightDOM of its own children (ie. add or remove children).
Elements added to the lightDOM, will need to be removed when changes occcur.
Elements removed from the lightDom, need to be cached and put back.
Such lightDom manipulation is far messier and far more fragile than the shadowDom manipulation the 
HelicopterParentChild pattern provides.
Even more, changes to the lightDom is likely to be affected by other CSS style rules that applies to the lightDom.
The HelicopterParent does not know about these rules, should not know about them, and 
must therefor be highly specific in order not to be overrun by them.
A generalizedd HelicopterParent that needs to alter the lightDom in or around its children 
in order to manage them would be extremely hard to manage

The HelicopterChild element (`<LI>`) serves as a placeholder for the dynamic alterations 
that the container element needs to perform. This placeholder can house and isolate such 
alterations in its own style, attributes, and shadowDom.
This isolation will contain the parents interference 
so that it doesn't interfere with other parts of the DOM.

This cannot be said often enough, so I repeat the warning. 
Do NOT attempt to generalize parental interference. 
Parental interference needs to be hemmed in.
Given time, all parents will exceed their given mandate, 
interfere inappropriately, and cause problems and bugs.
Only a customized child of a parent that has learned the 
methods of interpreting the parent and contain their 
interference properly should be exposed to such interference.
*This advice only applies to HTML elements of course.*

### Some final consolation
The HelicopterParentChild pattern feels a bit wrong at first.
Especially if you are a javascript developer.
In JS, such a pattern most often would be wrong. You have better tools in your belt.
In JS a simple loop would enable you to work between the elements of a list;
A mapping function would enable you to adapt only some child elements in a list.
In JS you can avoid creating two codependent classes like this.
  
In HTML, you have no `for`-loops. And no map function neither. Yes, HTML is limited. 
HTML requires a different mindset than JS.
If you don't like this mindset, I understand where you are coming from. You come from JS. 
Where you can think bigger thoughts.
However, once you learn the HelicopterParentChild pattern, it is not all bad.
You might even like it enough to use it in JS! 
Just remember that with this pattern you contain the complex interaction of the HelicopterParent
to its HelicopterChild. That means that if something goes wrong, you know where the fault lies:
the HelicopterParent, HelicopterChild or both. You also know that their interaction stays 
in the family: any errors here should not directly affect any other element in your app. 
And that is good. That makes it worth it.

#### References
* https://dom.spec.whatwg.org/#shadow-tree-slots