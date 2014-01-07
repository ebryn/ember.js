var get = Ember.get,
    set = Ember.set;

var Range = requireModule('htmlbars/runtime/range').Range;

var View = Ember.HTMLBars.View = function View(template, parentView, context) {
  this.parentView = parentView;
  this.context = context || parentView && parentView.context || this;
  this.template = template;
  this.streams = {};
  this.childViews = [];
  // we're intentionally avoiding chains, so finishChains isn't necessary
};

View.prototype = {
  isView: true,
  tagName: 'div',
  elementId: null,
  element: null,
  classNames: ['ember-view'],
  template: null,

  parentView: null,
  childViews: null,
  context: null,
  streams: null,

  render: function(parentEl) {
    var fragment = this.template(this, {data: {view: this}});

    if (this.isVirtual) {
      var range = new Range(parentEl.parent, fragment.firstChild, fragment.lastChild);
      this.element = range;
      parentEl.appendChild(fragment);
      this.childViews.forEach(function(cv) { cv.render(range); });
      return parentEl;
    } else {
      var el = this.element = document.createElement(this.tagName);
      if (this.elementId) { el.setAttribute('id', this.elementId); }
      if (this.classNames) { el.setAttribute('class', this.classNames.join(' ')); }

      el.appendChild(fragment);
      if (parentEl) { parentEl.appendChild(el); }
      this.childViews.forEach(function(cv) { cv.render(el); });
      return el;
    }
  },

  createChildView: function(ViewClass, template, context) {
    ViewClass = ViewClass || View;
    var childView = new ViewClass(template, this, context);
    this.childViews.push(childView); // FIXME: this should be done by appendChild
    return childView;
  },

  append: function() {
    document.body.appendChild(this.element);
  },

  appendTo: function(el) {
    el.appendChild(this.element);
  },

  streamFor: function(path) {
    var streams = this.streams,
        stream = streams[path];
    if (stream) { return stream; }
    stream = streams[path] = new ViewManagedStream();

    // handle {{this}} - comes through as empty string
    var context = path === '' ? this : this.context;
    path = path === '' ? 'context' : path;
    Ember.addObserver(context, path, this, 'streamPropertyDidChange');
    stream.next(get(context, path));
    return stream;
  },

  _previousContext: null, // used to avoid double looping streams
  contextWillChange: function() {
    this._previousContext = this.context;
  },

  contextDidChange: function() {
    var previousContext = this._previousContext,
        context = this.context,
        streams = this.streams,
        observerObj,
        observerPath;
    for (var path in streams) {
      observerObj = path === '' ? this : context;
      observerPath = path === '' ? 'context' : path;
      Ember.removeObserver((path === '' ? this : previousContext), observerPath, this, 'streamPropertyDidChange');
      Ember.addObserver(observerObj, observerPath, this, 'streamPropertyDidChange');
      streams[path].next(get(observerObj, observerPath));
    }
    this._previousContext = null;

    // Notifying children manually avoids chains, which saves us a lot of upfront work
    var childViews = this.childViews;
    for (var i = 0, l = childViews.length; i < l; i++) {
      childViews[i].parentViewContextDidChange(context);
    }
  },

  streamPropertyDidChange: function(obj, path) {
    var streams = this.streams,
        stream = streams[(obj === this && path === 'context' ? '' : path)];
    stream.next(get(obj, path));
  },

  parentViewContextDidChange: function(parentContext) {
    set(this, 'context', parentContext);
  },

  destroy: function() {
    this.element = this.template = this.parentView = this.childViews = this.context = this.streams = null;
  }
};

Ember.addBeforeObserver(View.prototype, 'context', null, 'contextWillChange');
Ember.addObserver(View.prototype, 'context', null, 'contextDidChange');

// Do we still need to do this if we're avoiding chains?
// View.prototype[Ember.META_KEY].proto = View.prototype;

// Turns out simple properties and observers wins perf wise over a CP for context
// Ember.defineProperty(View.prototype, 'context', Ember.computed(function(/*key, value*/) {
//   // if (arguments.length === 2) { return value; }
//   // TODO: controller
//   var parentView = this.parentView;
//   return get(parentView, 'context') || this;
// }));

var VirtualView = Ember.HTMLBars.VirtualView = function VirtualView(template, parentView, context) {
  View.call(this, template, parentView, context);
  this.isVirtual = true;
  this.tagName = null;
};

VirtualView.prototype = Object.create(View.prototype);

// Ember.merge(VirtualView.prototype, {
// });

var EachView = Ember.HTMLBars.EachView = function EachView(template, parentView, items) {
  var self = this;
  items = Ember.HTMLBars.A(items);
  View.call(this, template, parentView, items);
  this.arrayStream = new Ember.HTMLBars.ArrayObserverStream();
  this.arrayStream.subscribe(function(value) {
    Ember.run.schedule('render', self, 'arrayDidChange', value.obj, value.start, value.removed, value.added);
  });
  this.contextDidChange();
};

EachView.prototype = Object.create(View.prototype);

Ember.merge(EachView.prototype, {
  isVirtual: true,
  tagName: null,

  render: function(parentEl) {
    var el = this.element;

    this.childViews.forEach(function(cv) {
      cv.render(el);
    }, this);
  },

  createChildView: function(ViewClass, template, context) {
    ViewClass = ViewClass || View;
    var childView = new ViewClass(template, this, context);
    return childView;
  },

  contextWillChange: function() {},
  contextDidChange: function() {
    var context = this.context;
    if (context) {
      this.arrayStream.updateObj(context);
    }
  },

  // arrayWillChange: function(content, start, removed, added) {

  // },

  arrayDidChange: function(content, start, removed, added) {
    // teardown old views
    var childViews = this.childViews, childView;
    for (var idx = start; idx < start+removed; idx++) {
      childView = childViews[idx];
      childView.element.clear();
      childView.destroy();
    }

    var spliceArgs = [start, removed];

    for (idx = start; idx < start+added; idx++) {
      var item = content[idx];
      childView = this.createChildView(VirtualView, this.template, item);
      spliceArgs.push(childView);
      childView.render(this.element);
    }

    childViews.splice.apply(childViews, spliceArgs);
  }
});

function ViewManagedStream() {
  this.subscribers = [];
}

ViewManagedStream.prototype = {
  subscribers: null,
  lastValue: null,

  subscribe: function(next, error, complete) {
    var subscriber = { next: next, error: error, complete: complete };
    this.subscribers.push(subscriber);
    next(this.lastValue);
  },

  next: function next(value) {
    this.lastValue = value;
    this.subscribers.forEach(function(sub) { if (sub.next) sub.next(value); });
  },

  complete: function complete() {
    this.subscribers.forEach(function(sub) { if (sub.complete) sub.complete(); });
  },

  error: function error(reason) {
    this.subscribers.forEach(function(sub) { if (sub.error) sub.error(reason); });
  }
};