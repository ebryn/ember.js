import { merge } from "htmlbars/utils";
import { default as LazyValue } from "bound-templates/lazy-value";

var get = Ember.get,
    addObserver = Ember.addObserver,
    removeObserver = Ember.removeObserver;

export function EmberObserverLazyValue(obj, path) {
  this.obj = obj;
  this.path = path;

  addObserver(obj, path, this, 'notify');
};

EmberObserverLazyValue.prototype = Object.create(LazyValue.prototype); // TODO: polyfill

merge(EmberObserverLazyValue.prototype, {
  valueFn: function() {
    return get(this.obj, this.path);
  },

  destroy: function() {
    removeObserver(this.obj, this.path, this, 'didChange');
    this.obj = this.path = null;
    LazyValue.prototype.destroy.call(this);
  }
});
