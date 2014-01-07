module("Ember.HTMLBars");

var View = Ember.HTMLBars.View,
    EachView = Ember.HTMLBars.EachView,
    merge = requireModule('htmlbars/utils').merge;

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

test("#each", function() {
  var context = {rows: ["one", "two", "three"]};
  var view = new View(template("<ul>{{#each rows}}<li> {{this}}</li>{{/each}}</ul>"), null, context);

  var el = Ember.run(view, view.render);
  view.append();
  window.lastView = view;
  equalHTML(el, '<div class="ember-view"><ul><li> one</li><li> two</li><li> three</li></ul></div>');

  var start = Date.now();
  console.profile();
  Ember.run(function() {
    for (var i = 0, l = 10; i < l; i++) {
      context.rows.pushObject("mic check " + i);
    }
  });
  console.profileEnd();
  var elapsed = Date.now() - start;
  console.log(elapsed);
  console.log($('li', view.element).length);

  Ember.run(Ember, Ember.set, context, 'rows', ['just lonely ol me']);

  equalHTML(el, '<div class="ember-view"><ul><li> just lonely ol me</li></ul></div>');
});

/*
test("View creation performance - 60,000 views", function() {
  var t = template("{{#view}} {{foo}}{{/view}}{{#view}} {{foo}}{{/view}}{{#view}} {{foo}}{{/view}}{{#view}} {{foo}}{{/view}}{{#view}} {{foo}}{{/view}}");

  var start = Date.now();
  console.profile();
  for (var i = 0, l = 10000; i < l; i++) {
    var context = {foo: 'foo is here'};
    var view = new View(t, null, context);
    var el = view.render();
    view.append();
  }
  console.profileEnd();

  var elapsed = Date.now() - start;
  console.log(elapsed);

  ok(elapsed < 2000, "Actual time: " + elapsed + "ms. Target is less than 2000ms.");
});
*/