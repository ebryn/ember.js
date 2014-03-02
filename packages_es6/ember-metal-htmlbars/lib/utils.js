import { merge } from "htmlbars/utils";
import { default as LazyValue } from "bound-templates/lazy-value";

var get = Ember.get,
    addObserver = Ember.addObserver,
    removeObserver = Ember.removeObserver;

export function EmberObserverLazyValue(obj, path) {
  this.obj = obj;
  this.path = path;

  // intentionally not calling LazyValue's constructor
  // because valueFn is defined in our prototype

  addObserver(obj, path, this, 'notify');
};

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
