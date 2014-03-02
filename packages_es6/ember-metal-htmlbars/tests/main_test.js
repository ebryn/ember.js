import { compile, View, $, equalHTML, set, defaultOptions } from "ember-metal-htmlbars/tests/test_helpers";

module("ember-metal-htmlbars");

test("it works", function() {
  var template = compile("ohai");
  equalHTML(template(), "ohai");
});

test("basic binding", function() {
  var template = compile(" {{foo}}"),
      obj = {foo: "foo is here"},
      fragment = template(obj, defaultOptions);

  equalHTML(fragment, " foo is here");

  Ember.set(obj, 'foo', 'foo is still here');
  equalHTML(fragment, " foo is still here");
});

test("View", function() {
  var view = {isView: true, classNames: 'ember-view', template: compile("ohai"), templateOptions: defaultOptions},
      el = View.render(view);

  equalHTML(el, '<div class="ember-view">ohai</div>');
});

test("View with a binding inside", function() {
  var view = {isView: true, classNames: 'ember-view', template: compile(" {{foo}} {{bar.baz}}"), templateOptions: defaultOptions};

  Ember.set(view, 'context', {foo: 'foo is here', bar: {baz: 'baz!'}});

  var el = View.render(view);
  equalHTML(el, '<div class="ember-view"> foo is here baz!</div>');

  Ember.set(view, 'context.foo', 'i pity the foo');
  equalHTML(el, '<div class="ember-view"> i pity the foo baz!</div>');
});

test("View creation performance - 60,000 views", function() {
  var t = compile("{{#view}}{{foo}}{{/view}}{{#view}}{{foo}}{{/view}}{{#view}}{{foo}}{{/view}}{{#view}}{{foo}}{{/view}}{{#view}}{{foo}}{{/view}}");

  var start = Date.now();
  console.profile();
  Ember.run(function() {
    for (var i = 0, l = 10000; i < l; i++) {
      var context = {foo: 'foo is here'};
      var view = {isView: true, template: t, templateOptions: defaultOptions, context: context};
      View.appendTo(view, 'body');
    }
  });
  console.profileEnd();

  var elapsed = Date.now() - start;
  console.log(elapsed);

  ok(elapsed < 2000, "Actual time: " + elapsed + "ms. Target is less than 2000ms.");
});