module("Ember.HTMLBars");

var View = Ember.HTMLBars.View;
var merge = requireModule('htmlbars/utils').merge;

function template(str) {
  return Ember.HTMLBars.compile(str, {helpers: helpers});
}

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));
  equal(div.innerHTML, html);
}

test("it works", function() {
  var template = Ember.HTMLBars.compile("ohai");
  equalHTML(template(), "ohai");
});

test("basic binding", function() {
  var template = Ember.HTMLBars.compile(" {{foo}}"),
      obj = {foo: "foo is here"},
      fragment = template(obj);

  equalHTML(fragment, " foo is here");

  Ember.set(obj, 'foo', 'foo is still here');
  equalHTML(fragment, " foo is still here");
});

var helpers = {
  view: function(params, options) {
    var childView = options.data.view.createChildView();
    childView.template = function(context, templateOptions) {
      options.data = templateOptions.data;
      return options.render(context, options);
    };
    childView.templateData = options.data;
  }
};

test("View", function() {
  var view = new View(template("ohai")),
      el = view.render();

  equalHTML(el, '<div class="ember-view">ohai</div>');
});

test("View with a binding inside", function() {
  var view = new View(template("{{foo}} {{bar.baz}}"));

  Ember.set(view, 'context', {foo: 'foo is here', bar: {baz: 'baz!'}});

  var el = view.render();
  equalHTML(el, '<div class="ember-view">foo is here baz!</div>');

  Ember.set(view, 'context.foo', 'i pity the foo');
  equalHTML(el, '<div class="ember-view">i pity the foo baz!</div>');
});

test("View with a child", function() {
  var view = new View(template("{{#view}} {{foo}}{{/view}}"));
  var context = {foo: 'foo is here'};
  Ember.set(view, 'context', context);

  var el = view.render();
  equalHTML(el, '<div class="ember-view"><div class="ember-view"> foo is here</div></div>');

  Ember.set(context, 'foo', 'i pity the foo');
  equalHTML(el, '<div class="ember-view"><div class="ember-view"> i pity the foo</div></div>');
});