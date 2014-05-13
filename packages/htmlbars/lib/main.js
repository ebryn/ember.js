define("htmlbars", 
  ["htmlbars/parser","htmlbars/ast","htmlbars/compiler","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var preprocess = __dependency1__.preprocess;
    var ElementNode = __dependency2__.ElementNode;
    var BlockNode = __dependency2__.BlockNode;
    var compile = __dependency3__.compile;

    __exports__.preprocess = preprocess;
    __exports__.compile = compile;
    __exports__.ElementNode = ElementNode;
    __exports__.BlockNode = BlockNode;
  });
define("htmlbars/ast", 
  ["handlebars/compiler/ast","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var AST = __dependency1__["default"];

    var MustacheNode = AST.MustacheNode;
    __exports__.MustacheNode = MustacheNode;var SexprNode = AST.SexprNode;
    __exports__.SexprNode = SexprNode;var HashNode = AST.HashNode;
    __exports__.HashNode = HashNode;var IdNode = AST.IdNode;
    __exports__.IdNode = IdNode;var StringNode = AST.StringNode;
    __exports__.StringNode = StringNode;
    function ProgramNode(statements, strip) {
      this.type = 'program';
      this.statements = statements;
      this.strip = strip;
    }

    __exports__.ProgramNode = ProgramNode;function BlockNode(mustache, program, inverse, strip) {
      this.type = 'block';
      this.mustache = mustache;
      this.program = program;
      this.inverse = inverse;
      this.strip = strip;
    }

    __exports__.BlockNode = BlockNode;function ElementNode(tag, attributes, helpers, children) {
      this.type = 'element';
      this.tag = tag;
      this.attributes = attributes;
      this.helpers = helpers;
      this.children = children;
    }

    __exports__.ElementNode = ElementNode;function AttrNode(name, value) {
      this.type = 'attr';
      this.name = name;
      this.value = value;
    }

    __exports__.AttrNode = AttrNode;function TextNode(chars) {
      this.type = 'text';
      this.chars = chars;
    }

    __exports__.TextNode = TextNode;function childrenFor(node) {
      if (node.type === 'program') return node.statements;
      if (node.type === 'element') return node.children;
    }

    __exports__.childrenFor = childrenFor;function isCurly(node) {
      return node.type === 'mustache' || node.type === 'block';
    }

    __exports__.isCurly = isCurly;function appendChild(parent, node) {
      var children = childrenFor(parent);

      var len = children.length, last;
      if (len > 0) {
        last = children[len-1];
        if (isCurly(last) && isCurly(node)) {
          children.push(new TextNode(''));
        }
      }
      children.push(node);
    }

    __exports__.appendChild = appendChild;
  });
define("htmlbars/compiler", 
  ["htmlbars/parser","htmlbars/compiler/template","htmlbars/runtime/dom_helpers","htmlbars/runtime/placeholder","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    /*jshint evil:true*/
    var preprocess = __dependency1__.preprocess;
    var TemplateCompiler = __dependency2__.TemplateCompiler;
    var domHelpers = __dependency3__.domHelpers;
    var Placeholder = __dependency4__.Placeholder;

    function compile(string, options) {
      return compileSpec(string, options)(domHelpers(), Placeholder);
    }

    __exports__.compile = compile;function compileSpec(string, options) {
      var ast = preprocess(string, options);
      var compiler = new TemplateCompiler();
      var program = compiler.compile(ast);
      return new Function("dom", "Placeholder", "return " + program);
    }

    __exports__.compileSpec = compileSpec;
  });
define("htmlbars/compiler/ast_walker", 
  ["htmlbars/ast","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var childrenFor = __dependency1__.childrenFor;

    function Frame(program, parent, isBlock) {
      this.parent = parent;
      this.program = program;
      this.children = childrenFor(program);
      this.length = this.children.length;

      // cursor
      this.pos = this.length-1;
      this.inverse = false;

      // block tracking
      this.isBlock = isBlock;
      this.block = isBlock ? this : parent.block;
      this.stack = isBlock ? [['endTemplate', program]] : null;
      this.count = 0;
      this.mustacheCount = 0;
    }

    Frame.prototype.next = function() {
      var node;
      while (this.pos >= 0) {
        node = this.children[this.pos];
        if (this.inverse) {
          this.inverse = false;
          this.pos--;
          this.block.count++;
          return new Frame(node.program, this, true);
        }
        if (node.type === 'text') {
          this.block.stack.push(['text', node, this.pos, this.length]);
        } else if (node.type === 'block') {
          this.mustacheCount++;
          this.block.stack.push(['block', node, this.pos, this.length]);
          if (node.inverse) {
            this.inverse = true;
            this.block.count++;
            return new Frame(node.inverse, this, true);
          } else {
            this.pos--;
            this.block.count++;
            return new Frame(node.program, this, true);
          }
        } else if (node.type === 'element') {
          if (this.childElementFrame) {
            this.block.stack.push(['openElement', node, this.pos, this.length, this.childElementFrame.mustacheCount]);
            if (this.childElementFrame.mustacheCount) {
              // We only increment once vs add the mustache count because a child
              // element with multiple nodes is just a single consumer.
              this.mustacheCount++;
            }
            this.childElementFrame = null;
          } else {
            this.block.stack.push(['closeElement', node, this.pos, this.length]);
            this.childElementFrame = new Frame(node, this, false);
            this.childElementFrame.mustacheCount = node.helpers.length;
            return this.childElementFrame;
          }
        } else {
          if (node.type === 'mustache') {
            this.mustacheCount++;
          }
          this.block.stack.push(['node', node, this.pos, this.length]);
        }
        this.pos--;
      }
      if (this.isBlock) {
        this.block.stack.push(['startTemplate', this.program, this.block.count]);
      }
      return null;
    };

    function ASTWalker(compiler) {
      this.compiler = compiler;
    }

    __exports__.ASTWalker = ASTWalker;// Walks tree backwards depth first so that child
    // templates can be push onto stack then popped
    // off for its parent.
    ASTWalker.prototype.visit = function(program) {
      var frame = new Frame(program, null, true), next;
      while (frame) {
        next = frame.next();
        if (next === null) {
          if (frame.isBlock) {
            this.send(frame.stack);
          }
          frame = frame.parent;
        } else {
          frame = next;
        }
      }
    };

    ASTWalker.prototype.send = function(stack) {
      var compiler = this.compiler, tuple, name;
      while (tuple = stack.pop()) {
        name = tuple.shift();
        compiler[name].apply(compiler, tuple);
      }
    };

    // compiler.startTemplate(program, childTemplateCount);
    // compiler.endTemplate(program);
    // compiler.block(block, index, length);
    // compiler.openElement(element, index, length);
    // compiler.text(text, index, length);
    // compiler.closeElement(element, index, length);
    // compiler.node(node, index, length)
  });
define("htmlbars/compiler/fragment", 
  ["htmlbars/compiler/utils","htmlbars/compiler/quoting","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var processOpcodes = __dependency1__.processOpcodes;
    var string = __dependency2__.string;

    function FragmentCompiler() {
      this.source = [];
      this.depth = 0;
    }

    __exports__.FragmentCompiler = FragmentCompiler;FragmentCompiler.prototype.compile = function(opcodes) {
      this.source.length = 0;
      this.depth = 0;

      this.source.push('function build(dom) {\n');
      processOpcodes(this, opcodes);
      this.source.push('}\n');

      return this.source.join('');
    };

    FragmentCompiler.prototype.empty = function() {
      this.source.push('  return dom.createDocumentFragment();\n');
    };

    FragmentCompiler.prototype.startFragment = function() {
      this.source.push('  var el0 = dom.createDocumentFragment();\n');
    };

    FragmentCompiler.prototype.endFragment = function() {
      this.source.push('  return el0;\n');
    };

    FragmentCompiler.prototype.openRootElement = function(tagName) {
      this.source.push('  var el0 = dom.createElement('+string(tagName)+');\n');
    };

    FragmentCompiler.prototype.closeRootElement = function() {
      this.source.push('  return el0;\n');
    };

    FragmentCompiler.prototype.rootText = function(str) {
      this.source.push('  return dom.createTextNode('+string(str)+');\n');
    };

    FragmentCompiler.prototype.openElement = function(tagName) {
      var el = 'el'+(++this.depth);
      this.source.push('  var '+el+' = dom.createElement('+string(tagName)+');\n');
    };

    FragmentCompiler.prototype.setAttribute = function(name, value) {
      var el = 'el'+this.depth;
      this.source.push('  dom.setAttribute('+el+','+string(name)+','+string(value)+');\n');
    };

    FragmentCompiler.prototype.text = function(str) {
      var el = 'el'+this.depth;
      this.source.push('  dom.appendText('+el+','+string(str)+');\n');
    };

    FragmentCompiler.prototype.closeElement = function() {
      var child = 'el'+(this.depth--);
      var el = 'el'+this.depth;
      this.source.push('  '+el+'.appendChild('+child+');\n');
    };
  });
define("htmlbars/compiler/fragment_opcode", 
  ["./ast_walker","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ASTWalker = __dependency1__.ASTWalker;

    function FragmentOpcodeCompiler() {
      this.opcodes = [];
    }

    FragmentOpcodeCompiler.prototype.compile = function(ast) {
      var astWalker = new ASTWalker(this);
      astWalker.visit(ast);
      return this.opcodes;
    };

    FragmentOpcodeCompiler.prototype.opcode = function(type, params) {
      this.opcodes.push([type, params]);
    };

    FragmentOpcodeCompiler.prototype.text = function(text) {
      this.opcode('text', [text.chars]);
    };

    FragmentOpcodeCompiler.prototype.openElement = function(element) {
      this.opcode('openElement', [element.tag]);

      element.attributes.forEach(function(attribute) {
        this.attribute(attribute);
      }, this);
    };

    FragmentOpcodeCompiler.prototype.closeElement = function(element) {
      this.opcode('closeElement', [element.tag]);
    };

    FragmentOpcodeCompiler.prototype.startTemplate = function(program) {
      this.opcodes.length = 0;
      if (program.statements.length > 1) {
        this.opcode('startFragment');
      }
    };

    FragmentOpcodeCompiler.prototype.endTemplate = function(program) {
      if (program.statements.length === 0) {
        this.opcode('empty');
      } else if (program.statements.length === 1) {
        if (program.statements[0].type === 'text') {
          this.opcodes[0][0] = 'rootText';
        } else {
          var opcodes = this.opcodes;
          opcodes[0][0] = 'openRootElement';
          opcodes[opcodes.length-1][0] = 'closeRootElement';
        }
      } else {
        this.opcode('endFragment');
      }
    };

    FragmentOpcodeCompiler.prototype.node = function () {};

    FragmentOpcodeCompiler.prototype.block = function () {};

    FragmentOpcodeCompiler.prototype.attribute = function(attribute) {
      var name = attribute.name, value = attribute.value;
      if (value.length === 1 && value[0].type === 'text') {
        this.opcode('setAttribute', [name, value[0].chars]);
      }
    };

    __exports__.FragmentOpcodeCompiler = FragmentOpcodeCompiler;
  });
define("htmlbars/compiler/helpers", 
  ["htmlbars/compiler/quoting","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var array = __dependency1__.array;
    var hash = __dependency1__.hash;
    var string = __dependency1__.string;

    function prepareHelper(stack, size) {
      var args = [],
          types = [],
          hashPairs = [],
          hashTypes = [],
          keyName,
          i;

      var hashSize = stack.pop();

      for (i=0; i<hashSize; i++) {
        keyName = stack.pop();
        hashPairs.unshift(keyName + ':' + stack.pop());
        hashTypes.unshift(keyName + ':' + stack.pop());
      }

      for (i=0; i<size; i++) {
        args.unshift(stack.pop());
        types.unshift(stack.pop());
      }

      var programId = stack.pop();
      var inverseId = stack.pop();

      var options = ['types:' + array(types), 'hashTypes:' + hash(hashTypes), 'hash:' + hash(hashPairs)];

      if (programId !== null) {
        options.push('render:child' + programId);
      }

      if (inverseId !== null) {
        options.push('inverse:child' + inverseId);
      }

      return {
        options: options,
        args: array(args)
      };
    }

    __exports__.prepareHelper = prepareHelper;
  });
define("htmlbars/compiler/hydration", 
  ["htmlbars/compiler/utils","htmlbars/compiler/helpers","htmlbars/compiler/quoting","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var processOpcodes = __dependency1__.processOpcodes;
    var prepareHelper = __dependency2__.prepareHelper;
    var string = __dependency3__.string;
    var quotedArray = __dependency3__.quotedArray;
    var hash = __dependency3__.hash;
    var array = __dependency3__.array;

    function HydrationCompiler() {
      this.stack = [];
      this.source = [];
      this.mustaches = [];
      this.parents = ['fragment'];
      this.parentCount = 0;
      this.declarations = [];
    }

    var prototype = HydrationCompiler.prototype;

    prototype.compile = function(opcodes) {
      this.stack.length = 0;
      this.mustaches.length = 0;
      this.source.length = 0;
      this.parents.length = 1;
      this.declarations.length = 0;
      this.parentCount = 0;

      processOpcodes(this, opcodes);

      if (this.declarations.length) {
        var decs = "  var ";
        for (var i = 0, l = this.declarations.length; i < l; ++i) {
          var dec = this.declarations[i];
          decs += dec[0];
          decs += " = ";
          decs += dec[1];
          if (i+1 === l) {
            decs += ';\n';
          } else {
            decs += ', ';
          }
        }
        this.source.unshift(decs);
      }

      return this.source.join('');
    };

    prototype.program = function(programId, inverseId) {
      this.stack.push(inverseId);
      this.stack.push(programId);
    };

    prototype.id = function(parts) {
      this.stack.push(string('id'));
      this.stack.push(string(parts.join('.')));
    };

    prototype.literal = function(literal) {
      this.stack.push(string(typeof literal));
      this.stack.push(literal);
    };

    prototype.stringLiteral = function(str) {
      this.stack.push(string('string'));
      this.stack.push(string(str));
    };

    prototype.stackLiteral = function(literal) {
      this.stack.push(literal);
    };

    prototype.helper = function(name, size, escaped, placeholderNum) {
      var prepared = prepareHelper(this.stack, size);
      prepared.options.push('escaped:'+escaped);
      prepared.options.push('data:(typeof options !== "undefined" && options.data)');
      this.pushMustacheInContent(string(name), prepared.args, prepared.options, placeholderNum);
    };

    prototype.ambiguous = function(str, escaped, placeholderNum) {
      this.pushMustacheInContent(string(str), '[]', ['escaped:'+escaped], placeholderNum);
    };

    prototype.ambiguousAttr = function(str, escaped) {
      this.stack.push('['+string(str)+', [], {escaped:'+escaped+'}]');
    };

    prototype.helperAttr = function(name, size, escaped) {
      var prepared = prepareHelper(this.stack, size);
      prepared.options.push('escaped:'+escaped);

      this.stack.push('['+string(name)+','+prepared.args+','+ hash(prepared.options)+']');
    };

    prototype.sexpr = function(name, size) {
      var prepared = prepareHelper(this.stack, size);

      //export function SUBEXPR(helperName, context, params, options) {
      this.stack.push('helpers.SUBEXPR(' + string(name) + ', context, ' + prepared.args + ', ' + hash(prepared.options) + ', helpers)');
    };

    prototype.string = function(str) {
      this.stack.push(string(str));
    };

    prototype.nodeHelper = function(name, size) {
      var prepared = prepareHelper(this.stack, size);
      this.pushMustacheInNode(string(name), prepared.args, prepared.options);
    };

    prototype.placeholder = function(num, parentPath, startIndex, endIndex) {
      var parentIndex = parentPath.length === 0 ? 0 : parentPath[parentPath.length-1];
      var parent = this.getParent();
      var placeholder = "Placeholder.create("+parent+","+
        (startIndex === null ? "-1" : startIndex)+","+
        (endIndex === null ? "-1" : endIndex)+")";

      this.declarations.push(['placeholder' + num, placeholder]);
    };

    prototype.pushMustacheInContent = function(name, args, pairs, placeholderNum) {
      this.source.push('  helpers.CONTENT(placeholder' + placeholderNum + ', ' + name + ', context, ' + args + ', ' + hash(pairs) + ', helpers);\n');
    };

    prototype.pushMustacheInNode = function(name, args, pairs) {
      this.source.push('  helpers.ELEMENT(' + this.getParent() + ', ' + name + ', context, ' + args + ', ' + hash(pairs) + ', helpers);\n');
    };

    prototype.shareParent = function(i) {
      var parentNodesName = "parent" + this.parentCount++;
      this.declarations.push([parentNodesName, this.getParent() + '.childNodes[' + i + ']']);
      this.parents.push(parentNodesName);
    };

    prototype.consumeParent = function(i) {
      this.parents.push(this.getParent() + '.childNodes[' + i + ']');
    };

    prototype.popParent = function() {
      this.parents.pop();
    };

    prototype.getParent = function() {
      return this.parents[this.parents.length-1];
    };

    __exports__.HydrationCompiler = HydrationCompiler;
  });
define("htmlbars/compiler/hydration_opcode", 
  ["./ast_walker","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ASTWalker = __dependency1__.ASTWalker;

    function HydrationOpcodeCompiler() {
      this.opcodes = [];
      this.paths = [];
      this.templateId = 0;
      this.currentDOMChildIndex = 0;
      this.placeholders = [];
      this.placeholderNum = 0;
    }

    HydrationOpcodeCompiler.prototype.compile = function(ast) {
      var astWalker = new ASTWalker(this);
      astWalker.visit(ast);
      return this.opcodes;
    };

    HydrationOpcodeCompiler.prototype.startTemplate = function() {
      this.opcodes.length = 0;
      this.paths.length = 0;
      this.placeholders.length = 0;
      this.templateId = 0;
      this.currentDOMChildIndex = -1;
      this.placeholderNum = 0;
    };

    HydrationOpcodeCompiler.prototype.endTemplate = function(program) {
      distributePlaceholders(this.placeholders, this.opcodes);
      if (program.statements.length === 1 && program.statements[0].type !== 'text') {
        this.opcodes.shift();
        this.opcodes.pop();
      }
    };

    HydrationOpcodeCompiler.prototype.text = function(string) {
      ++this.currentDOMChildIndex;
    };

    HydrationOpcodeCompiler.prototype.openElement = function(element, pos, len, mustacheCount) {
      distributePlaceholders(this.placeholders, this.opcodes);
      ++this.currentDOMChildIndex;

      if (mustacheCount > 1) {
        this.opcode('shareParent', this.currentDOMChildIndex);
      } else {
        this.opcode('consumeParent', this.currentDOMChildIndex);
      }

      this.paths.push(this.currentDOMChildIndex);
      this.currentDOMChildIndex = -1;

      element.attributes.forEach(function(attribute) {
        this.attribute(attribute);
      }, this);

      element.helpers.forEach(function(helper) {
        this.nodeHelper(helper);
      }, this);
    };

    HydrationOpcodeCompiler.prototype.closeElement = function(element) {
      distributePlaceholders(this.placeholders, this.opcodes);
      this.opcode('popParent');
      this.currentDOMChildIndex = this.paths.pop();
    };

    HydrationOpcodeCompiler.prototype.node = function (node, childIndex, childrenLength) {
      this[node.type](node, childIndex, childrenLength);
    };

    HydrationOpcodeCompiler.prototype.block = function(block, childIndex, childrenLength) {
      var currentDOMChildIndex = this.currentDOMChildIndex,
          mustache = block.mustache;

      var start = (currentDOMChildIndex < 0 ? null : currentDOMChildIndex),
          end = (childIndex === childrenLength - 1 ? null : currentDOMChildIndex + 1);

      var placeholderNum = this.placeholderNum++;
      this.placeholders.push([placeholderNum, this.paths.slice(), start, end]);

      this.opcode('program', this.templateId++, block.inverse === null ? null : this.templateId++);
      processParams(this, mustache.params);
      processHash(this, mustache.hash);
      this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped, placeholderNum);
    };

    HydrationOpcodeCompiler.prototype.opcode = function(type) {
      var params = [].slice.call(arguments, 1);
      this.opcodes.push([type, params]);
    };

    HydrationOpcodeCompiler.prototype.attribute = function(attribute) {
      var name = attribute.name, value = attribute.value;

      if (value.length === 0 || (value.length === 1 && value[0].type === 'text')) {
        return;
      }

      // We treat attribute like a ATTRIBUTE helper evaluated by the ELEMENT hook.
      // <p {{ATTRIBUTE 'class' 'foo ' (bar)}}></p>

      // Unwrapped any mustaches to just be their internal sexprs.
      var params = [name];

      for (var i = 0, l = value.length; i < l; i++) {
        var node = value[i];
        if (node.type === 'mustache') {
          params.push(node.sexpr);
        } else {
          params.push(node);
        }
      }

      this.nodeHelper({
        params: params,
        hash: null,
        id: {
          string: 'ATTRIBUTE'
        }
      });
    };

    HydrationOpcodeCompiler.prototype.nodeHelper = function(mustache) {
      this.opcode('program', null, null);
      processParams(this, mustache.params);
      processHash(this, mustache.hash);
      this.opcode('nodeHelper', mustache.id.string, mustache.params.length, this.paths.slice());
    };

    HydrationOpcodeCompiler.prototype.mustache = function(mustache, childIndex, childrenLength) {
      var currentDOMChildIndex = this.currentDOMChildIndex;

      var start = currentDOMChildIndex,
          end = (childIndex === childrenLength - 1 ? -1 : currentDOMChildIndex + 1);

      var placeholderNum = this.placeholderNum++;
      this.placeholders.push([placeholderNum, this.paths.slice(), start, end]);

      if (mustache.isHelper) {
        this.opcode('program', null, null);
        processParams(this, mustache.params);
        processHash(this, mustache.hash);
        this.opcode('helper', mustache.id.string, mustache.params.length, mustache.escaped, placeholderNum);
      } else {
        this.opcode('ambiguous', mustache.id.string, mustache.escaped, placeholderNum);
      }
    };

    HydrationOpcodeCompiler.prototype.sexpr = function(sexpr) {
      this.string('sexpr');
      this.opcode('program', null, null);
      processParams(this, sexpr.params);
      processHash(this, sexpr.hash);
      this.opcode('sexpr', sexpr.id.string, sexpr.params.length);
    };

    HydrationOpcodeCompiler.prototype.string = function(str) {
      this.opcode('string', str);
    };

    HydrationOpcodeCompiler.prototype.mustacheInAttr = function(mustache) {
      if (mustache.isHelper) {
        this.opcode('program', null, null);
        processParams(this, mustache.params);
        processHash(this, mustache.hash);
        this.opcode('helperAttr', mustache.id.string, mustache.params.length, mustache.escaped);
      } else {
        this.opcode('ambiguousAttr', mustache.id.string, mustache.escaped);
      }
    };

    HydrationOpcodeCompiler.prototype.ID = function(id) {
      this.opcode('id', id.parts);
    };

    HydrationOpcodeCompiler.prototype.STRING = function(string) {
      this.opcode('stringLiteral', string.stringModeValue);
    };

    HydrationOpcodeCompiler.prototype.BOOLEAN = function(boolean) {
      this.opcode('literal', boolean.stringModeValue);
    };

    HydrationOpcodeCompiler.prototype.INTEGER = function(integer) {
      this.opcode('literal', integer.stringModeValue);
    };

    function processParams(compiler, params) {
      params.forEach(function(param) {
        if (param.type === 'text') {
          compiler.STRING({ stringModeValue: param.chars });
        } else if (param.type) {
          compiler[param.type](param);
        } else {
          compiler.STRING({ stringModeValue: param });
        }
      });
    }

    function processHash(compiler, hash) {
      if (hash) {
        hash.pairs.forEach(function(pair) {
          var name = pair[0], param = pair[1];
          compiler[param.type](param);
          compiler.opcode('stackLiteral', name);
        });
        compiler.opcode('stackLiteral', hash.pairs.length);
      } else {
        compiler.opcode('stackLiteral', 0);
      }
    }

    function distributePlaceholders(placeholders, opcodes) {
      if (placeholders.length === 0) {
        return;
      }

      // Splice placeholders after the most recent shareParent/consumeParent.
      var o;
      for (o = opcodes.length - 1; o >= 0; --o) {
        var opcode = opcodes[o][0];
        if (opcode === 'shareParent' || opcode === 'consumeParent' || opcode === 'popParent') {
          break;
        }
      }

      var spliceArgs = [o + 1, 0];
      for (var i = 0; i < placeholders.length; ++i) {
        var p = placeholders[i];
        spliceArgs.push(['placeholder', [p[0], p[1], p[2], p[3]]]);
      }
      opcodes.splice.apply(opcodes, spliceArgs);
      placeholders.length = 0;
    }

    __exports__.HydrationOpcodeCompiler = HydrationOpcodeCompiler;
  });
define("htmlbars/compiler/quoting", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function escapeString(str) {
      return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
    }

    __exports__.escapeString = escapeString;

    function string(str) {
      return '"' + escapeString(str) + '"';
    }

    __exports__.string = string;

    function array(a) {
      return "[" + a + "]";
    }

    __exports__.array = array;

    function quotedArray(list) {
      return array(list.map(string).join(", "));
    }

    __exports__.quotedArray = quotedArray;function hash(pairs) {
      return "{" + pairs.join(",") + "}";
    }

    __exports__.hash = hash;
  });
define("htmlbars/compiler/template", 
  ["./fragment_opcode","./fragment","./hydration_opcode","./hydration","./ast_walker","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var FragmentOpcodeCompiler = __dependency1__.FragmentOpcodeCompiler;
    var FragmentCompiler = __dependency2__.FragmentCompiler;
    var HydrationOpcodeCompiler = __dependency3__.HydrationOpcodeCompiler;
    var HydrationCompiler = __dependency4__.HydrationCompiler;
    var ASTWalker = __dependency5__.ASTWalker;

    function TemplateCompiler() {
      this.fragmentOpcodeCompiler = new FragmentOpcodeCompiler();
      this.fragmentCompiler = new FragmentCompiler();
      this.hydrationOpcodeCompiler = new HydrationOpcodeCompiler();
      this.hydrationCompiler = new HydrationCompiler();
      this.templates = [];
      this.childTemplates = [];
    }

    __exports__.TemplateCompiler = TemplateCompiler;TemplateCompiler.prototype.compile = function(ast) {
      var astWalker = new ASTWalker(this);
      astWalker.visit(ast);
      return this.templates.pop();
    };

    TemplateCompiler.prototype.startTemplate = function(program, childTemplateCount) {
      this.fragmentOpcodeCompiler.startTemplate(program, childTemplateCount);
      this.hydrationOpcodeCompiler.startTemplate(program, childTemplateCount);

      this.childTemplates.length = 0;
      while(childTemplateCount--) {
        this.childTemplates.push(this.templates.pop());
      }
    };

    TemplateCompiler.prototype.endTemplate = function(program) {
      this.fragmentOpcodeCompiler.endTemplate(program);
      this.hydrationOpcodeCompiler.endTemplate(program);

      // function build(dom) { return fragment; }
      var fragmentProgram = this.fragmentCompiler.compile(
        this.fragmentOpcodeCompiler.opcodes
      );

      // function hydrate(fragment) { return mustaches; }
      var hydrationProgram = this.hydrationCompiler.compile(
        this.hydrationOpcodeCompiler.opcodes
      );

      var childTemplateVars = "";
      for (var i=0, l=this.childTemplates.length; i<l; i++) {
        childTemplateVars +=   '  var child' + i + '=' + this.childTemplates[i] + ';\n';
      }

      var template =
        '(function (){\n' +
          childTemplateVars +
          fragmentProgram +
        'var cachedFragment = null;\n' +
        'return function template(context, options) {\n' +
        '  if (cachedFragment === null) {\n' +
        '    cachedFragment = build(dom);\n' +
        '  }\n' +
        '  var fragment = cachedFragment.cloneNode(true);\n' +
        '  var helpers = options && options.helpers || {};\n' +
           hydrationProgram +
        '  return fragment;\n' +
        '};\n' +
        '}())';

      this.templates.push(template);
    };

    TemplateCompiler.prototype.openElement = function(element, i, l, c) {
      this.fragmentOpcodeCompiler.openElement(element, i, l, c);
      this.hydrationOpcodeCompiler.openElement(element, i, l, c);
    };

    TemplateCompiler.prototype.closeElement = function(element, i, l) {
      this.fragmentOpcodeCompiler.closeElement(element, i, l);
      this.hydrationOpcodeCompiler.closeElement(element, i, l);
    };

    TemplateCompiler.prototype.block = function(block, i, l) {
      this.fragmentOpcodeCompiler.block(block, i, l);
      this.hydrationOpcodeCompiler.block(block, i, l);
    };

    TemplateCompiler.prototype.text = function(string, i, l) {
      this.fragmentOpcodeCompiler.text(string, i, l);
      this.hydrationOpcodeCompiler.text(string, i, l);
    };

    TemplateCompiler.prototype.node = function (node, i, l) {
      this.fragmentOpcodeCompiler.node(node, i, l);
      this.hydrationOpcodeCompiler.node(node, i, l);
    };
  });
define("htmlbars/compiler/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function processOpcodes(compiler, opcodes) {
      for (var i=0, l=opcodes.length; i<l; i++) {
        var method = opcodes[i][0];
        var params = opcodes[i][1];
        compiler[method].apply(compiler, params);
      }
    }

    __exports__.processOpcodes = processOpcodes;
  });
define("htmlbars/html-parser/node-handlers", 
  ["htmlbars/ast","htmlbars/html-parser/tokens","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var BlockNode = __dependency1__.BlockNode;
    var ProgramNode = __dependency1__.ProgramNode;
    var TextNode = __dependency1__.TextNode;
    var appendChild = __dependency1__.appendChild;
    var Chars = __dependency2__.Chars;

    var nodeHelpers = {

      program: function(program) {
        var statements = [];
        var node = new ProgramNode(statements, program.strip);
        var i, l = program.statements.length;
        var statement;

        this.elementStack.push(node);

        if (l === 0) return this.elementStack.pop();

        statement = program.statements[0];
        if (statement.type === 'block' || statement.type === 'mustache') {
          statements.push(new TextNode(''));
        }

        for (i = 0; i < l; i++) {
          this.acceptNode(program.statements[i]);
        }

        this.acceptToken(this.tokenizer.tokenizeEOF());

        statement = program.statements[l-1];
        if (statement.type === 'block' || statement.type === 'mustache') {
          statements.push(new TextNode(''));
        }

        // Remove any stripped whitespace
        l = statements.length;
        for (i = 0; i < l; i++) {
          statement = statements[i];
          if (statement.type !== 'text') continue;

          if ((i > 0 && statements[i-1].strip && statements[i-1].strip.right) ||
            (i === 0 && program.strip.left)) {
            statement.chars = statement.chars.replace(/^\s+/, '');
          }

          if ((i < l-1 && statements[i+1].strip && statements[i+1].strip.left) ||
            (i === l-1 && program.strip.right)) {
            statement.chars = statement.chars.replace(/\s+$/, '');
          }

          // Remove unnecessary text nodes
          if (statement.chars.length === 0) {
            if ((i > 0 && statements[i-1].type === 'element') ||
              (i < l-1 && statements[i+1].type === 'element')) {
              statements.splice(i, 1);
              i--;
              l--;
            }
          }
        }

        // Ensure that that the element stack is balanced properly.
        var poppedNode = this.elementStack.pop();
        if (poppedNode !== node) {
          throw new Error("Unclosed element: " + poppedNode.tag);
        }

        return node;
      },

      block: function(block) {
        switchToHandlebars(this);
        this.acceptToken(block);

        var mustache = block.mustache;
        var program = this.acceptNode(block.program);
        var inverse = block.inverse ? this.acceptNode(block.inverse) : null;
        var strip = block.strip;

        // Normalize inverse's strip
        if (inverse && !inverse.strip.left) {
          inverse.strip.left = false;
        }

        var node = new BlockNode(mustache, program, inverse, strip);
        var parentProgram = this.currentElement();
        appendChild(parentProgram, node);
      },

      content: function(content) {
        var tokens = this.tokenizer.tokenizePart(content.string);

        return tokens.forEach(function(token) {
          this.acceptToken(token);
        }, this);
      },

      mustache: function(mustache) {
        switchToHandlebars(this);
        this.acceptToken(mustache);
      }

    };

    function switchToHandlebars(processor) {
      var token = processor.tokenizer.token;

      // TODO: Monkey patch Chars.addChar like attributes
      if (token instanceof Chars) {
        processor.acceptToken(token);
        processor.tokenizer.token = null;
      }
    }

    __exports__["default"] = nodeHelpers;
  });
define("htmlbars/html-parser/token-handlers", 
  ["htmlbars/ast","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ElementNode = __dependency1__.ElementNode;
    var TextNode = __dependency1__.TextNode;
    var appendChild = __dependency1__.appendChild;

    // This table maps from the state names in the tokenizer to a smaller
    // number of states that control how mustaches are handled
    var states = {
      "beforeAttributeValue": "before-attr",
      "attributeValueDoubleQuoted": "attr",
      "attributeValueSingleQuoted": "attr",
      "attributeValueUnquoted": "attr",
      "beforeAttributeName": "in-tag"
    };

    var voidTagNames = "area base br col command embed hr img input keygen link meta param source track wbr";
    var voidMap = {};

    voidTagNames.split(" ").forEach(function(tagName) {
      voidMap[tagName] = true;
    });

    // Except for `mustache`, all tokens are only allowed outside of
    // a start or end tag.
    var tokenHandlers = {

      Chars: function(token) {
        var current = this.currentElement();
        var text = new TextNode(token.chars);
        appendChild(current, text);
      },

      StartTag: function(tag) {
        var element = new ElementNode(tag.tagName, tag.attributes, tag.helpers || [], []);
        this.elementStack.push(element);
        if (voidMap.hasOwnProperty(tag.tagName)) {
          tokenHandlers.EndTag.call(this, tag);
        }
      },

      block: function(block) {
        if (this.tokenizer.state !== 'data') {
          throw new Error("A block may only be used inside an HTML element or another block.");
        }
      },

      mustache: function(mustache) {
        var state = this.tokenizer.state;
        var token = this.tokenizer.token;

        switch(states[state]) {
          case "before-attr":
            this.tokenizer.state = 'attributeValueUnquoted';
            token.addToAttributeValue(mustache);
            return;
          case "attr":
            token.addToAttributeValue(mustache);
            return;
          case "in-tag":
            token.addTagHelper(mustache);
            return;
          default:
            appendChild(this.currentElement(), mustache);
        }
      },

      EndTag: function(tag) {
        var current = this.currentElement();

        if (current.tag !== tag.tagName) {
          throw new Error("Closing tag " + tag.tagName + " did not match last open tag " + current.tag);
        }

        this.elementStack.pop();
        appendChild(this.currentElement(), current);
      }

    };

    __exports__["default"] = tokenHandlers;
  });
define("htmlbars/html-parser/tokens", 
  ["simple-html-tokenizer","htmlbars/ast","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Chars = __dependency1__.Chars;
    var StartTag = __dependency1__.StartTag;
    var EndTag = __dependency1__.EndTag;
    var AttrNode = __dependency2__.AttrNode;
    var TextNode = __dependency2__.TextNode;

    StartTag.prototype.startAttribute = function(char) {
      this.addCurrentAttributeKey();
      this.currentAttribute = new AttrNode(char.toLowerCase(), []);
      this.attributes.push(this.currentAttribute);
    };

    StartTag.prototype.addToAttributeName = function(char) {
      this.currentAttribute.name += char;
    };

    StartTag.prototype.addToAttributeValue = function(char) {
      var value = this.currentAttribute.value;

      if (char.type === 'mustache') {
        value.push(char);
      } else {
        if (value.length > 0 && value[value.length - 1].type === 'text') {
          value[value.length - 1].chars += char;
        } else {
          value.push(new TextNode(char));
        }
      }
    };

    StartTag.prototype.finalize = function() {
      this.addCurrentAttributeKey();
      delete this.currentAttribute;
      return this;
    };

    StartTag.prototype.addCurrentAttributeKey = function() {
      var attr = this.currentAttribute;
      if (attr) {
        this.attributes[attr.name] = attr.value;
      }
    };

    StartTag.prototype.addTagHelper = function(helper) {
      var helpers = this.helpers = this.helpers || [];
      helpers.push(helper);
    };

    __exports__.Chars = Chars;
    __exports__.StartTag = StartTag;
    __exports__.EndTag = EndTag;
  });
define("htmlbars/parser", 
  ["handlebars","simple-html-tokenizer","htmlbars/html-parser/node-handlers","htmlbars/html-parser/token-handlers","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var Handlebars = __dependency1__["default"];
    var Tokenizer = __dependency2__.Tokenizer;
    var nodeHandlers = __dependency3__["default"];
    var tokenHandlers = __dependency4__["default"];

    function preprocess(html, options) {
      var ast = Handlebars.parse(html);
      var combined = new HTMLProcessor(options || {}).acceptNode(ast);
      return combined;
    }

    __exports__.preprocess = preprocess;function HTMLProcessor(options) {
      this.elementStack = [];
      this.tokenizer = new Tokenizer('');
      this.nodeHandlers = nodeHandlers;
      this.tokenHandlers = tokenHandlers;
    }

    HTMLProcessor.prototype.acceptNode = function(node) {
      return this.nodeHandlers[node.type].call(this, node);
    };

    HTMLProcessor.prototype.acceptToken = function(token) {
      if (token) {
        return this.tokenHandlers[token.type].call(this, token);
      }
    };

    HTMLProcessor.prototype.currentElement = function() {
      return this.elementStack[this.elementStack.length - 1];
    };
  });
define("htmlbars/runtime", 
  ["htmlbars/runtime/dom_helpers","htmlbars/runtime/placeholder","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var domHelpers = __dependency1__.domHelpers;
    var Placeholder = __dependency2__.Placeholder;

    function hydrate(spec, options) {
      return spec(domHelpers(options && options.extensions), Placeholder);
    }

    __exports__.hydrate = hydrate;
  });
define("htmlbars/runtime/dom_helpers", 
  ["htmlbars/utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var merge = __dependency1__.merge;

    function domHelpers(extensions) {
      var base = {
        appendText: function(element, text) {
          element.appendChild(document.createTextNode(text));
        },

        setAttribute: function(element, name, value) {
          element.setAttribute(name, value);
        },

        createElement: function(tagName) {
          return document.createElement(tagName);
        },

        createDocumentFragment: function() {
          return document.createDocumentFragment();
        },

        createTextNode: function(text) {
          return document.createTextNode(text);
        }
      };

      return extensions ? merge(extensions, base) : base;
    }

    __exports__.domHelpers = domHelpers;
  });
define("htmlbars/runtime/helpers", 
  ["handlebars/safe-string","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var SafeString = __dependency1__["default"];

    function CONTENT(placeholder, helperName, context, params, options) {
      var value, helper = this.LOOKUP_HELPER(helperName, context, options);
      if (helper) {
        value = helper(context, params, options);
      } else {
        value = this.SIMPLE(context, helperName, options);
      }
      if (!options.escaped) {
        value = new SafeString(value);
      }
      placeholder.update(value);
    }

    __exports__.CONTENT = CONTENT;function ELEMENT(element, helperName, context, params, options) {
      var helper = this.LOOKUP_HELPER(helperName, context, options);
      if (helper) {
        options.element = element;
        helper(context, params, options);
      }
    }

    __exports__.ELEMENT = ELEMENT;function ATTRIBUTE(context, params, options) {
      for (var i = 1, l = params.length; i < l; ++i) {
        if (options.types[i] === 'id') {
          params[i] = this.SIMPLE(context, params[i], options);
        }
      }

      options.element.setAttribute(params[0], params.slice(1).join(''));
    }

    __exports__.ATTRIBUTE = ATTRIBUTE;function SUBEXPR(helperName, context, params, options) {
      var helper = this.LOOKUP_HELPER(helperName, context, options);
      if (helper) {
        return helper(context, params, options);
      } else {
        return this.SIMPLE(context, helperName, options);
      }
    }

    __exports__.SUBEXPR = SUBEXPR;function LOOKUP_HELPER(helperName, context, options) {
      if (helperName === 'ATTRIBUTE') {
        return this.ATTRIBUTE;
      }
    }

    __exports__.LOOKUP_HELPER = LOOKUP_HELPER;function SIMPLE(context, name, options) {
      return context[name];
    }

    __exports__.SIMPLE = SIMPLE;
  });
define("htmlbars/runtime/placeholder", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var splice = Array.prototype.splice;

    function Placeholder(parent, start, end) {
      // TODO: this is an internal API, this should be an assert
      if (parent.nodeType === 11) {
        if (start === null || end === null) {
          throw new Error('a fragment parent must have boundary nodes in order to detect insertion');
        }
        this.element = null;
      } else {
        this.element = parent;
      }
      this._parent = parent;
      this.start = start;
      this.end = end;
      this.text = null;
      this.owner = null;
      this.placeholders = null;
      this.before = null;
      this.after = null;
      this.escaped = true;
    }

    __exports__.Placeholder = Placeholder;Placeholder.create = function (parent, startIndex, endIndex) {
      var childNodes = parent.childNodes,
        start = startIndex === -1 ? null : childNodes[startIndex],
        end = endIndex === -1 ? null : childNodes[endIndex];
      return new Placeholder(parent, start, end);
    };

    Placeholder.prototype.parent = function () {
      if (!this.element && this._parent !== this.start.parentNode) {
        this.element = this._parent = this.start.parentNode;
      }
      return this._parent;
    };

    Placeholder.prototype.destroy = function () {
      if (this.owner) {
        this.owner.removePlaceholder(this);
      } else {
        clear(this.element || this.parent(), this.start, this.end);
      }
    };

    Placeholder.prototype.removePlaceholder = function (placeholder) {
      var placeholders = this.placeholders;
      for (var i=0, l=placeholders.length; i<l; i++) {
        if (placeholders[i] === placeholder) {
          this.replace(i, 1);
          break;
        }
      }
    };

    Placeholder.prototype.update = function (nodeOrString) {
      this._update(this.element || this.parent(), nodeOrString);
    };

    Placeholder.prototype.updateNode = function (node) {
      var parent = this.element || this.parent();
      if (!node) return this._updateText(parent, '');
      this._updateNode(parent, node);
    };

    Placeholder.prototype.updateText = function (text) {
      this._updateText(this.element || this.parent(), text);
    };

    Placeholder.prototype.updateHTML = function (html) {
      var parent = this.element || this.parent();
      if (!html) return this._updateText(parent, '');
      this._updateHTML(parent, html);
    };

    Placeholder.prototype._update = function (parent, nodeOrString) {
      if (nodeOrString === null || nodeOrString === undefined) {
        this._updateText(parent, '');
      } else if (typeof nodeOrString === 'string') {
        if (this.escaped) {
          this._updateText(parent, nodeOrString);
        } else {
          this._updateHTML(parent, nodeOrString);
        }
      } else if (nodeOrString.nodeType) {
        this._updateNode(parent, nodeOrString);
      } else if (nodeOrString.string) { // duck typed SafeString
        this._updateHTML(parent, nodeOrString.string);
      } else {
        this._updateText(parent, nodeOrString.toString());
      }
    };

    Placeholder.prototype._updateNode = function (parent, node) {
      if (this.text) {
        if (node.nodeType === 3) {
          this.text.nodeValue = node.nodeValue;
          return;
        } else {
          this.text = null;
        }
      }
      var start = this.start, end = this.end;
      clear(parent, start, end);
      parent.insertBefore(node, end);
      if (this.before !== null) {
        this.before.end = start.nextSibling;
      }
      if (this.after !== null) {
        this.after.start = end.previousSibling;
      }
    };

    Placeholder.prototype._updateText = function (parent, text) {
      if (this.text) {
        this.text.nodeValue = text;
        return;
      }
      var node = parent.ownerDocument.createTextNode(text);
      this.text = node;
      clear(parent, this.start, this.end);
      parent.insertBefore(node, this.end);
      if (this.before !== null) {
        this.before.end = node;
      }
      if (this.after !== null) {
        this.after.start = node;
      }
    };

    Placeholder.prototype._updateHTML = function (parent, html) {
      var start = this.start, end = this.end;
      clear(parent, start, end);
      this.text = null;
      var element;
      if (parent.nodeType === 11) {
        /* TODO require templates always have a contextual element
           instead of element0 = frag */
        element = parent.ownerDocument.createElement('div');
      } else {
        element = parent.cloneNode(false);
      }
      element.innerHTML = html;
      appendChildren(parent, end, element.childNodes);
      if (this.before !== null) {
        this.before.end = start.nextSibling;
      }
      if (this.after !== null) {
        this.after.start = end.previousSibling;
      }
    };

    Placeholder.prototype.replace = function (index, removedLength, addedNodes) {
      if (this.placeholders === null) this.placeholders = [];
      var parent = this.element || this.parent(),
        placeholders = this.placeholders,
        before = index > 0 ? placeholders[index-1] : null,
        after = index+removedLength < placeholders.length ? placeholders[index+removedLength] : null,
        start = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling),
        end   = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling),
        addedLength = addedNodes === undefined ? 0 : addedNodes.length,
        args, i, current;

      if (removedLength > 0) {
        clear(parent, start, end);
      }

      if (addedLength === 0) {
        if (before !== null) {
          before.after = after;
          before.end = end;
        }
        if (after !== null) {
          after.before = before;
          after.start = start;
        }
        placeholders.splice(index, removedLength);
        return;
      }

      args = new Array(addedLength+2);
      if (addedLength > 0) {
        for (i=0; i<addedLength; i++) {
          args[i+2] = current = new Placeholder(parent, start, end);
          current._update(parent, addedNodes[i]);
          current.owner = this;
          if (before !== null) {
            current.before = before;
            before.end = start.nextSibling;
            before.after = current;
          }
          before = current;
          start = end === null ? parent.lastChild : end.previousSibling;
        }
        if (after !== null) {
          current.after = after;
          after.start = end.previousSibling;
        }
      }

      args[0] = index;
      args[1] = removedLength;

      splice.apply(placeholders, args);
    };

    function appendChildren(parent, end, nodeList) {
      var ref = end,
          i = nodeList.length,
          node;
      while (i--) {
        node = nodeList[i];
        parent.insertBefore(node, ref);
        ref = node;
      }
    }

    function clear(parent, start, end) {
      var current, previous;
      if (end === null) {
        current = parent.lastChild;
      } else {
        current = end.previousSibling;
      }

      while (current !== null && current !== start) {
        previous = current.previousSibling;
        parent.removeChild(current);
        current = previous;
      }
    }
  });
define("htmlbars/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function merge(options, defaults) {
      for (var prop in defaults) {
        if (options.hasOwnProperty(prop)) { continue; }
        options[prop] = defaults[prop];
      }
      return options;
    }

    __exports__.merge = merge;
  });
//
//# sourceMappingURL=htmlbars-0.1.0.amd.js.map