var view;

module("Ember.Handlebars - group helper", {
  setup: function() {},

  teardown: function() {
    view.destroy();
    Ember.run.end();
    Ember.run.cancelTimers();
  }
});

function createView(template, options) {
  options = options || {};
  options.template = Ember.Handlebars.compile(template);
  view = Ember.View.create(options);
}

function appendView() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
}

function stripAndTrim(str) {
  return str.replace(/\s+/g, ' ').trim();
}

test("should properly modify behavior inside the block", function() {
  createView("{{#group}}{{ohai}} {{there}}{{/group}}", {ohai: 'ohai', there: 'there'});
  appendView();
  equal(view.$('script').length, 2, "Only one set of Metamorph markers");
  equal(view.$().text(), 'ohai there', "Values are output correctly");
});

test("should rerender the group upon a property change", function() {
  createView("{{#group}}{{msg}}{{/group}}", {msg: 'ohai'});
  appendView();
  equal(view.$().text(), 'ohai', 'Original value was rendered');

  Ember.run(function() {
    view.set('msg', 'ohbai');
  });
  equal(view.$().text(), 'ohbai', 'Updated value was rendered');
});

test("an #each can be nested", function() {
  createView(
    "{{#group}}{{#each numbers}}{{this}}{{/each}}{{/group}}",
    {numbers: Ember.A([1, 2, 3, 4, 5])}
  );
  appendView();
  equal(view.$('script').length, 2, "Only one set of Metamorph markers");
  equal(view.$().text(), '12345');

  Ember.run(function() {
    view.get('numbers').pushObject(6);
  });

  equal(view.$().text(), '123456');

  Ember.run(function() {
    view.set('numbers', ['a', 'b', 'c']);
  });

  equal(view.$().text(), 'abc');
});

test("an #each can be nested with a #view inside", function() {
  var yehuda = {name: 'Yehuda'};
  createView(
    '{{#group}}{{#each people}}{{#view nameBinding="name"}}{{name}}{{/view}}{{/each}}{{/group}}',
    {people: Ember.A([yehuda, {name: 'Tom'}])}
  );
  appendView();
  equal(view.$('script').length, 2, "Only one set of Metamorph markers");
  equal(view.$().text(), 'YehudaTom');

  Ember.run(function() {
    Ember.set(yehuda, 'name', 'Erik');
  });

  equal(view.$('script').length, 2, "Only one set of Metamorph markers");
  equal(view.$().text(), 'ErikTom');
});

test("a #view can be nested", function() {
  createView(
    '{{#group}}' +
    '  {{#view Ember.View ohaiBinding="ohai"}}' +
    '    {{ohai}}' +
    '  {{/view}}' +
    '{{/group}}',
    {ohai: 'ohai'}
  );
  appendView();
  equal(view.$().text().trim(), 'ohai');
  equal(view.$('script').length, 2, "Only one set of Metamorph markers");
});

test("property changes inside views should only rerender their view", function() {
  createView(
    '{{#group}}' +
    '  {{#view msgBinding="msg"}}' +
    '    {{msg}}' +
    '  {{/view}}' +
    '{{/group}}',
    {msg: 'ohai'}
  );
  var rerenderWasCalled = false;
  view.reopen({
    rerender: function() { rerenderWasCalled = true; this._super(); }
  });
  appendView();
  equal(view.$('script').length, 2, "Only one set of Metamorph markers");
  equal(view.$().text().trim(), 'ohai', 'Original value was rendered');

  Ember.run(function() {
    view.set('msg', 'ohbai');
  });
  ok(!rerenderWasCalled, "The GroupView rerender method was not called");
  equal(view.$().text().trim(), 'ohbai', "The updated value was rendered");
});

test("should work with bindAttr", function() {
  createView(
    '{{#group}}' +
    '  <button {{bindAttr class="innerClass"}}>ohai</button>' +
    '{{/group}}',
    {innerClass: 'magic'}
  );
  appendView();
  equal(view.$('.magic').length, 1);
  Ember.run(function() {
    view.set('innerClass', 'bindings');
  });
  equal(view.$('.bindings').length, 1);
  Ember.run(function() {
    view.rerender();
  });
  equal(view.$('.bindings').length, 1);
});

test("works with #if", function() {
  createView(
    '{{#group}}' +
    '  {{#if something}}' +
    '    true' +
    ' {{else}}' +
    '    false' +
    '  {{/if}}' +
    '{{/group}}',
    {something: true}
  );
  appendView();

  debugger;

  equal(view.$('script').length, 2, "Only one set of Metamorph markers");
  equal(view.$().text().trim(), 'true', 'Truthy text was rendered');

  Ember.run(function() {
    view.set('something', false);
  });
  equal(view.$().text().trim(), 'false', "The falsy value was rendered");
});
