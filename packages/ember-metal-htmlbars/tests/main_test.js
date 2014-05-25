import { compile, View, $, equalHTML, set, defaultOptions, appendTo } from "ember-metal-htmlbars/tests/test_helpers";
import run from "ember-metal/run_loop";

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

  set(obj, 'foo', 'foo is still here');
  equalHTML(fragment, " foo is still here");
});

test("View", function() {
  var view = {isView: true, classNames: 'ember-view', template: compile("ohai"), templateOptions: defaultOptions},
      el = appendTo(view, '#qunit-fixture');

  equalHTML(el, '<div class="ember-view">ohai</div>');
});

test("View with a binding inside", function() {
  var view = {isView: true, classNames: 'ember-view', template: compile(" {{foo}} {{bar.baz}}"), templateOptions: defaultOptions};

  set(view, 'context', {foo: 'foo is here', bar: {baz: 'baz!'}});

  var el = appendTo(view, '#qunit-fixture');
  equalHTML(el, '<div class="ember-view"> foo is here baz!</div>');

  set(view, 'context.foo', 'i pity the foo');
  equalHTML(el, '<div class="ember-view"> i pity the foo baz!</div>');
});
/*
test("View creation performance - 60,000 views", function() {
  var t = compile("{{#view}}{{foo}}{{/view}}{{#view}}{{foo}}{{/view}}{{#view}}{{foo}}{{/view}}{{#view}}{{foo}}{{/view}}{{#view}}{{foo}}{{/view}}");

  var start = Date.now();
  console.profile();
  run(function() {
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
*/