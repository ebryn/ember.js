var get = Ember.get,
    set = Ember.set;

var Range = requireModule('htmlbars/runtime/range').Range,
    Utils = Ember.Utils,
    finishChains = Ember.finishChains,
    META_KEY = Ember.META_KEY,
    GUID_KEY = Ember.GUID_KEY,
    viewGuid = 0;

var View = Ember.HTMLBars.View = function View(template, parentView, context) {
  this[GUID_KEY] = viewGuid++;
  this.parentView = parentView;
  this.context = context || parentView && parentView.context || this;
  this.template = template;
  // this.streams = {};
  // this.childViews = [];
  // this.classNames = this.classNames.slice();
  // Utils.inheritMeta(this);
  // finishChains(this);
};

var BoundTemplatesRuntime = requireModule('bound-templates/runtime');

var defaultOptions = {
  data: {view: null},

  helpers: {
    STREAM_FOR: Ember.HTMLBars.STREAM_FOR,
    RESOLVE: BoundTemplatesRuntime.RESOLVE,
    ATTRIBUTE: BoundTemplatesRuntime.ATTRIBUTE,
    RESOLVE_IN_ATTR: BoundTemplatesRuntime.RESOLVE_IN_ATTR,

    view: function(params, options) {
      options.data.view.createChildView(View, options.render);
    },

    each: function(params, options) {
      var view = options.data.view,
          template = function(context, templateOptions) {
            options.data = templateOptions.data;
            return options.render(context, options);
          },
          eachView = view.createChildView(EachView, template);

      eachView.element = options.element;
      eachView.templateData = options.data;

      params[0].subscribe(function(value) {
        eachView.arrayStream.updateObj(value);
      });
      // return eachView.arrayStream;
    }
  }
};

View.DEFAULT_TEMPLATE_OPTIONS = defaultOptions;

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

  toString: function() {
    return "<HTMLBars.View:" + this[GUID_KEY] + ">";
  },

  render: function(parentEl) {
    var templateOptions = {helpers: defaultOptions.helpers, data: {view: this}},
        fragment = this.template(this, templateOptions),
        childViews = this.childViews,
        classNames = this.classNames,
        childView, i, l;

    if (this.isVirtual) {
      return this._renderVirtual(parentEl, fragment, childViews);
    } else {
      var el = this.element = document.createElement(this.tagName);
      if (this.elementId) { el.setAttribute('id', this.elementId); }
      if (classNames && classNames.length === 1) {
        el.setAttribute('class', this.classNames[0]);
      } else if (classNames && classNames.length > 1) {
        el.setAttribute('class', this.classNames.join(' '));
      }

      el.appendChild(fragment);
      if (parentEl) { parentEl.appendChild(el); }
      if (!childViews) { return el; }
      for (i = 0, l = childViews.length; i < l; i++) {
        childView = childViews[i];
        childView.render(el);
      }
      return el;
    }
  },

  _renderVirtual: function(parentEl, fragment, childViews) {
    var range = new Range(parentEl.parent, fragment.firstChild, fragment.lastChild),
        childView, i, l;
    this.element = range;
    parentEl.appendChild(fragment);
    if (!childViews) { return parentEl; }
    for (i = 0, l = childViews.length; i < l; i++) {
      childView = childViews[i];
      childView.render(range);
    }
    return parentEl;
  },

  createChildView: function(ViewClass, template, context) {
    ViewClass = ViewClass || View;
    var childViews = this.childViews,
        childView = new ViewClass(template, this, context);
    if (!childViews) {
      childViews = this.childViews = [childView];
    } else {
      childViews.push(childView); // FIXME: this should be done by appendChild
    }
    return childView;
  },

  append: function() {
    document.body.appendChild(this.element);
  },

  appendTo: function(el) {
    el.appendChild(this.element);
  },

  streamFor: function(path) {
    var streams = this.streams;
    if (!streams) { streams = this.streams = {}; }
    var stream = streams[path];
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
    if (!childViews) { return; }
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

// View.prototype[META_KEY] = Ember.platform.defineProperty(View.prototype, META_KEY, Ember.META_DESC);
// View.prototype[GUID_KEY] = Ember.platform.defineProperty(View.prototype, GUID_KEY, Ember.GUID_DESC);
View.prototype[META_KEY] = null;
View.prototype[GUID_KEY] = viewGuid++;
Ember.addBeforeObserver(View.prototype, 'context', null, 'contextWillChange');
Ember.addObserver(View.prototype, 'context', null, 'contextDidChange');
// Ember.addObserver(View.prototype, 'parentView.context', null, 'parentViewContextDidChange');

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
    var el = this.element,
        childViews = this.childViews,
        childView;

    if (!childViews) { return; }
    for (var i = 0, l = childViews.length; i < l; i++) {
      childView = childViews[i];
      childView.render(el);
    }
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
    var childViews = this.childViews, childView, idx;

    if (childViews) {
      for (idx = start; idx < start+removed; idx++) {
        childView = childViews[idx];
        childView.element.clear();
        childView.destroy();
      }
    }

    var spliceArgs = childViews ? [start, removed] : new Array(added);

    for (idx = start; idx < start+added; idx++) {
      var item = content[idx];
      childView = this.createChildView(VirtualView, this.template, item);
      spliceArgs.push(childView);
      childView.render(this.element);
    }

    if (childViews) {
      childViews.splice.apply(childViews, spliceArgs);
    } else {
      this.childViews = spliceArgs;
    }
  }
});

function ViewManagedStream() {}

ViewManagedStream.prototype = {
  subscribers: null,
  lastValue: null,

  subscribe: function(next, error, complete) {
    var subscribers = this.subscribers,
        subscriber = { next: next, error: error, complete: complete };

    if (!subscribers) {
      subscribers = this.subscribers = [subscriber];
    } else {
      subscribers.push(subscriber);
    }

    next(this.lastValue);
  },

  next: function next(value) {
    var subscribers = this.subscribers,
        sub;
    this.lastValue = value;
    if (!subscribers) { return; }

    for (var i = 0, l = subscribers.length; i < l; i++) {
      sub = subscribers[i];
      if (sub.next) { sub.next(value); }
    }
  },

  complete: function complete() {
    this.subscribers.forEach(function(sub) { if (sub.complete) sub.complete(); });
  },

  error: function error(reason) {
    this.subscribers.forEach(function(sub) { if (sub.error) sub.error(reason); });
  }
};