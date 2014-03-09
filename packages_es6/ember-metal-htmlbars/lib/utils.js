import { merge } from "htmlbars/utils";
import LazyValue from "bound-templates/lazy-value";
import { get } from "ember-metal/property_get";
import { addObserver, removeObserver } from "ember-metal/observer";

export function EmberObserverLazyValue(obj, path) {
  this.obj = obj;
  this.path = path;

  // intentionally not calling LazyValue's constructor
  // because valueFn is defined in our prototype

  addObserver(obj, path, this, 'notify');
}

EmberObserverLazyValue.prototype = Object.create(LazyValue.prototype); // TODO: polyfill

merge(EmberObserverLazyValue.prototype, {
  valueFn: function() {
    return get(this.obj, this.path);
  },

  updateObject: function(newObj) {
    removeObserver(this.obj, this.path, this, 'notify');
    this.obj = newObj;
    this.notify();
    addObserver(newObj, this.path, this, 'notify');
  },

  destroy: function() {
    removeObserver(this.obj, this.path, this, 'notify');
    this.obj = this.path = null;
    LazyValue.prototype.destroy.call(this);
  }
});
