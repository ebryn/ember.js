import { Mixin } from "ember-metal/mixin";
import EnumerableUtils from "ember-metal/enumerable_utils";
import run from "ember-metal/run_loop";
import { sendEvent, addListener, removeListener } from "ember-metal/events";
import { appendChild, createChildView, render, remove } from "ember-metal-views";
import { PlaceholderList } from "htmlbars/runtime/placeholder_list";

export function each(params, options) {
  var view = options.data.view,
      hash = options.hash,
      eachView = Object.create(eachViewPrototype);

  eachView.itemTemplate = options.render;
  eachView.element = eachView._placeholder = new PlaceholderList(options.placeholder);
  eachView.templateOptions = view.templateOptions;
  eachView._parentView = view;
  eachView.context = A(params[0].value());
  eachView.arrayStream = new ArrayObserverStream();
  eachView.arrayStream.subscribe(function(value) {
    run.schedule('render', eachView, 'arrayDidChange', value.obj, value.start, value.removed, value.added);
  });
  eachView.contextDidChange();

  appendChild(view, eachView);

  params[0].onNotify(function(sender) {
    eachView.arrayStream.updateObj(sender.value());
  });
}

var eachViewPrototype = {
  isView: true,
  isVirtual: true,
  tagName: null,

  contextWillChange: function() {},
  contextDidChange: function() {
    var context = this.context;
    if (context) {
      this.arrayStream.updateObj(context);
    }
  },

  arrayDidChange: function(content, start, removed, added) {
    // teardown old views
    var childViews = this.childViews, childView, idx;

    if (childViews) {
      for (idx = start; idx < start+removed; idx++) {
        childView = childViews[idx];
        childView.isDestroyed = true;
        remove(childView);
        // childView.destroy();
      }
    }

    // FIXME: if added is 0, do nothing

    var spliceArgs = childViews ? [start, removed] : [], // TODO: new Array(len) this
        frags = new Array(added),
        placeholderList = this._placeholder;

    for (idx = start; idx < start+added; idx++) {
      var item = content[idx];
      childView = createChildView(this, {isView: true, isVirtual: true, template: this.itemTemplate, templateOptions: this.templateOptions, context: item});
      spliceArgs.push(childView);
      frags[idx-start] = render(childView);
    }

    if (childViews) {
      childViews.splice.apply(childViews, spliceArgs);
    } else {
      this.childViews = spliceArgs;
    }

    placeholderList.replace(start, removed, frags);
  }
};

// SimpleObservableArrayMixin: the insanely faster way of observing arrays
var SimpleObservableArrayMixin = Mixin.create({
  pushObject: function(obj) {
    this.replace(this.length, 0, [obj]);
  },

  replace: function(idx, amt, objects) {
    // if we replaced exactly the same number of items, then pass only the
    // replaced range. Otherwise, pass the full remaining array length
    // since everything has shifted
    var len = objects ? objects.length : 0;
    if (len === 0) {
      this.splice(idx, amt);
    } else {
      EnumerableUtils._replace(this, idx, amt, objects);
    }
    this.arrayContentDidChange(idx, amt, len);
    return this;
  },

  arrayContentDidChange: function(startIdx, removeAmt, addAmt) {
    // if no args are passed assume everything changes
    if (startIdx === undefined) {
      startIdx = 0;
      removeAmt = addAmt = -1;
    } else {
      if (removeAmt === undefined) removeAmt =- 1;
      if (addAmt    === undefined) addAmt =- 1;
    }

    sendEvent(this, '@array:change', [this, startIdx, removeAmt, addAmt]);

    // var length      = get(this, 'length'),
    //     cachedFirst = cacheFor(this, 'firstObject'),
    //     cachedLast  = cacheFor(this, 'lastObject');
    // if (this.objectAt(0) !== cachedFirst) {
    //   Ember.propertyWillChange(this, 'firstObject');
    //   Ember.propertyDidChange(this, 'firstObject');
    // }
    // if (this.objectAt(length-1) !== cachedLast) {
    //   Ember.propertyWillChange(this, 'lastObject');
    //   Ember.propertyDidChange(this, 'lastObject');
    // }

    return this;
  },

  addArrayObserver: function(target) {
    addListener(this, '@array:change', target, 'arrayDidChange');
    return this;
  },

  removeArrayObserver: function(target) {
    removeListener(this, '@array:change', target, 'arrayDidChange');
    return this;
  }
});

function A(arr) {
  if (typeof arr === 'undefined') { arr = []; }
  return SimpleObservableArrayMixin.detect(arr) ? arr : SimpleObservableArrayMixin.apply(arr);
}

function ArrayObserverStream(obj) {
  if (obj) { this.updateObj(obj); }
}

ArrayObserverStream.prototype = {
  obj: null,

  next: null,
  error: null,
  complete: null,

  updateObj: function(newObj) {
    newObj = A(newObj);

    var oldLength = 0;
    if (this.obj) {
      oldLength = this.obj.length;
      this.obj.removeArrayObserver(this);
    }
    this.obj = newObj;
    if (newObj) { newObj.addArrayObserver(this); }
    this.arrayDidChange(newObj, 0, oldLength, newObj.length);
  },

  subscribe: function(next, error, complete) {
    this.next = next;
    this.error = error;
    this.complete = complete;

    // TODO: publish whole array?
    // next(this.lastValue);
  },

  arrayWillChange: function(content, start, removed, added) {},
  arrayDidChange: function(content, start, removed, added) {
    this.next({obj: content, start: start, removed: removed, added: added});
  },

  destroy: function() {
    this.updateObj(null);
    this.next = this.error = this.complete = null;
  }
};