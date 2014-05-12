import Container from "container";
import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import { View as EmberView } from "ember-views/views/view";

var container, view;

module("EmberView - Template Functionality", {
  setup: function() {
    container = new Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    run(function() {
      if (view) { view.destroy(); }
    });
  }
});

test("should call the function of the associated template", function() {
  container.register('template:testTemplate', function() {
    var el = document.createElement('h1');
    el.setAttribute('id', 'twas-called');
    el.innerText = 'template was called';
    return el;
  });

  view = EmberView.create({
    container: container,
    templateName: 'testTemplate'
  });

  run(function() {
    view.createElement();
  });

  ok(view.$('#twas-called').length, "the named template was called");
});

test("should call the function of the associated template with itself as the context", function() {
  container.register('template:testTemplate', function(view) {
    var el = document.createElement('h1');
    el.setAttribute('id', 'twas-called');
    el.innerText = "template was called for " + get(view.context, 'personName');
    return el;
  });

  view = EmberView.create({
    container: container,
    templateName: 'testTemplate',

    context: {
      personName: "Tom DAAAALE"
    }
  });

  run(function() {
    view.createElement();
  });

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should fall back to defaultTemplate if neither template nor templateName are provided", function() {
  var View;

  View = EmberView.extend({
    defaultTemplate: function(view) {
      var el = document.createElement('h1');
      el.setAttribute('id', 'twas-called');
      el.innerText = "template was called for " + get(view.context, 'personName');
      return el;
    }
  });

  view = View.create({
    context: {
      personName: "Tom DAAAALE"
    }
  });

  run(function() {
    view.createElement();
  });

  equal("template was called for Tom DAAAALE", view.$('#twas-called').text(), "the named template was called with the view as the data source");
});

test("should not use defaultTemplate if template is provided", function() {
  var View;

  View = EmberView.extend({
    template:  function() { return document.createTextNode("foo"); },
    defaultTemplate: function(dataSource) {
      var el = document.createElement('h1');
      el.setAttribute('id', 'twas-called');
      el.innerText = "template was called for " + get(dataSource, 'personName');
      return el;
    }
  });

  view = View.create();
  run(function() {
    view.createElement();
  });

  equal("foo", view.$().text(), "default template was not printed");
});

test("should not use defaultTemplate if template is provided", function() {
  var View;

  container.register('template:foobar', function() { return document.createTextNode("foo"); });

  View = EmberView.extend({
    container: container,
    templateName: 'foobar',
    defaultTemplate: function(dataSource) {
      var el = document.createElement('h1');
      el.setAttribute('id', 'twas-called');
      el.innerText = "template was called for " + get(dataSource, 'personName');
      return el;
    }
  });

  view = View.create();
  run(function() {
    view.createElement();
  });

  equal("foo", view.$().text(), "default template was not printed");
});

test("should render an empty element if no template is specified", function() {
  view = EmberView.create();
  run(function() {
    view.createElement();
  });

  equal(view.$().html(), '', "view div should be empty");
});

test("should provide a controller to the template if a controller is specified on the view", function() {
  expect(7);

  var Controller1 = EmberObject.extend({
    toString: function() { return "Controller1"; }
  });

  var Controller2 = EmberObject.extend({
    toString: function() { return "Controller2"; }
  });

  var controller1 = Controller1.create(),
      controller2 = Controller2.create(),
      optionsDataKeywordsControllerForView,
      optionsDataKeywordsControllerForChildView,
      contextForView,
      contextForControllerlessView;

  view = EmberView.create({
    controller: controller1,

    template: function(view, options) {
      optionsDataKeywordsControllerForView = options.data.keywords.controller;
    }
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  strictEqual(optionsDataKeywordsControllerForView, controller1, "passes the controller in the data");

  run(function() {
    view.destroy();
  });

  var parentView = EmberView.create({
    controller: controller1,

    template: function(buffer, options) {
      options.data.view.appendChild(EmberView.create({
        controller: controller2,
        templateData: options.data,
        template: function(context, options) {
          contextForView = context;
          optionsDataKeywordsControllerForChildView = options.data.keywords.controller;
        }
      }));
      optionsDataKeywordsControllerForView = options.data.keywords.controller;
    }
  });

  run(function() {
    parentView.appendTo('#qunit-fixture');
  });

  strictEqual(optionsDataKeywordsControllerForView, controller1, "passes the controller in the data");
  strictEqual(optionsDataKeywordsControllerForChildView, controller2, "passes the child view's controller in the data");

  run(function() {
    parentView.destroy();
  });

  var parentViewWithControllerlessChild = EmberView.create({
    controller: controller1,

    template: function(buffer, options) {
      options.data.view.appendChild(EmberView.create({
        templateData: options.data,
        template: function(context, options) {
          contextForControllerlessView = context;
          optionsDataKeywordsControllerForChildView = options.data.keywords.controller;
        }
      }));
      optionsDataKeywordsControllerForView = options.data.keywords.controller;
    }
  });

  run(function() {
    parentViewWithControllerlessChild.appendTo('#qunit-fixture');
  });

  strictEqual(optionsDataKeywordsControllerForView, controller1, "passes the original controller in the data");
  strictEqual(optionsDataKeywordsControllerForChildView, controller1, "passes the controller in the data to child views");
  strictEqual(contextForView, controller2, "passes the controller in as the main context of the parent view");
  strictEqual(contextForControllerlessView, controller1, "passes the controller in as the main context of the child view");

  run(function() {
    parentView.destroy();
    parentViewWithControllerlessChild.destroy();
  });
});
