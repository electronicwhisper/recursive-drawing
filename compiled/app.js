
(function(/*! Stitch !*/) {
  if (!this.require) {
    var modules = {}, cache = {}, require = function(name, root) {
      var path = expand(root, name), module = cache[path], fn;
      if (module) {
        return module.exports;
      } else if (fn = modules[path] || modules[path = expand(path, './index')]) {
        module = {id: path, exports: {}};
        try {
          cache[path] = module;
          fn(module.exports, function(name) {
            return require(name, dirname(path));
          }, module);
          return module.exports;
        } catch (err) {
          delete cache[path];
          throw err;
        }
      } else {
        throw 'module \'' + name + '\' not found';
      }
    }, expand = function(root, name) {
      var results = [], parts, part;
      if (/^\.\.?(\/|$)/.test(name)) {
        parts = [root, name].join('/').split('/');
      } else {
        parts = name.split('/');
      }
      for (var i = 0, length = parts.length; i < length; i++) {
        part = parts[i];
        if (part == '..') {
          results.pop();
        } else if (part != '.' && part != '') {
          results.push(part);
        }
      }
      return results.join('/');
    }, dirname = function(path) {
      return path.split('/').slice(0, -1).join('/');
    };
    this.require = function(name) {
      return require(name, '');
    }
    this.require.define = function(bundle) {
      for (var key in bundle)
        modules[key] = bundle[key];
    };
  }
  return this.require.define;
}).call(this)({"app": function(exports, require, module) {(function() {
  var canvas, circle, combineComponents, ctx, definitions, init, localCoords, makeDefinitionCanvas, makeDefinitionCanvases, model, movedCircle, render, setSize, square, ui, workspaceView;

  model = require("model");

  circle = model.makePrimitiveDefinition(function(ctx) {
    return ctx.arc(0, 0, 1, 0, Math.PI * 2);
  });

  square = model.makePrimitiveDefinition(function(ctx) {
    return ctx.rect(-1, -1, 2, 2);
  });

  window.movedCircle = movedCircle = model.makeCompoundDefinition();

  definitions = [circle, square, movedCircle];

  ui = {
    focus: movedCircle,
    view: model.makeTransform([1, 0, 0, 1, 400, 300]),
    size: [100, 100],
    mouse: [100, 100],
    mouseOver: [],
    mouseOverEdge: false,
    dragging: false
  };

  canvas = null;

  ctx = null;

  init = function() {
    var stats;
    canvas = $("#main");
    ctx = canvas[0].getContext('2d');
    setSize();
    $(window).resize(setSize);
    $(window).mousemove(function(e) {
      var c, c0, canvasPos, components, constraintType, d, mouse;
      canvasPos = canvas.offset();
      ui.mouse = [e.clientX - canvasPos.left, e.clientY - canvasPos.top];
      if (ui.dragging) {
        if (ui.dragging.pan) {
          mouse = localCoords([], ui.mouse);
          d = numeric['-'](mouse, ui.dragging.pan);
          ui.focus.view = ui.focus.view.mult(model.makeTransform([1, 0, 0, 1, d[0], d[1]]));
        } else if (ui.dragging.definition && e.target === canvas[0]) {
          mouse = localCoords([], ui.mouse);
          c = ui.focus.add(ui.dragging.definition, model.makeTransform([1, 0, 0, 1, mouse[0], mouse[1]]));
          ui.mouseOver = {
            componentPath: [c],
            edge: false
          };
          $("#workspace canvas").mousedown();
        } else if (ui.dragging.componentPath) {
          components = ui.dragging.componentPath;
          c0 = components[0];
          mouse = localCoords([], ui.mouse);
          constraintType = ui.mouseOver.edge ? (key.shift ? "scale" : "scaleRotate") : "translate";
          c0.transform = require("solveConstraint")(components, ui.dragging.startPosition, ui.dragging.originalCenter, mouse)[constraintType]();
        }
      }
      return render();
    });
    $("#workspace").mousewheel(function(e, delta) {
      var scale, scaleFactor, scaleT, t1, t2, trans;
      scaleFactor = 1.1;
      scale = Math.pow(scaleFactor, delta);
      scaleT = model.makeTransform([scale, 0, 0, scale, 0, 0]);
      trans = ui.view.inverse().p(ui.mouse);
      t1 = model.makeTransform([1, 0, 0, 1, trans[0], trans[1]]);
      t2 = model.makeTransform([1, 0, 0, 1, -trans[0], -trans[1]]);
      ui.focus.view = t1.mult(scaleT.mult(t2.mult(ui.focus.view)));
      return render();
    });
    $(window).mousedown(function(e) {
      return e.preventDefault();
    });
    $("#workspace canvas").mousedown(function(e) {
      if (ui.mouseOver) {
        return ui.dragging = {
          componentPath: ui.mouseOver.componentPath,
          startPosition: localCoords(ui.mouseOver.componentPath, ui.mouse),
          originalCenter: combineComponents(ui.mouseOver.componentPath).p([0, 0])
        };
      } else {
        return ui.dragging = {
          pan: localCoords([], ui.mouse)
        };
      }
    });
    $("#definitions").on("mousedown", "canvas", function(e) {
      var definition;
      definition = $(this).data("definition");
      return ui.dragging = {
        definition: definition
      };
    });
    $("#definitions").on("click", "canvas", function(e) {
      var definition;
      definition = $(this).data("definition");
      ui.focus = definition;
      return render();
    });
    $("#addDefinition").on("click", function(e) {
      var newDef;
      newDef = model.makeCompoundDefinition();
      definitions.push(newDef);
      ui.focus = newDef;
      return render();
    });
    $(window).mouseup(function(e) {
      return ui.dragging = false;
    });
    stats = new Stats();
    stats.getDomElement().style.position = 'absolute';
    stats.getDomElement().style.left = '0px';
    stats.getDomElement().style.bottom = '0px';
    document.body.appendChild(stats.getDomElement());
    return setInterval((function() {
      return stats.update();
    }), 1000 / 60);
  };

  setSize = function() {
    var minDimension, windowSize;
    ui.size = windowSize = [$(canvas).width(), $(canvas).height()];
    canvas.attr({
      width: windowSize[0],
      height: windowSize[1]
    });
    minDimension = Math.min(windowSize[0], windowSize[1]);
    ui.view = model.makeTransform([minDimension / 2, 0, 0, minDimension / 2, windowSize[0] / 2, windowSize[1] / 2]);
    require("config").maxScale = windowSize[0] * windowSize[1];
    return render();
  };

  render = function() {
    var check, renderer;
    renderer = require("makeRenderer")(ui.focus);
    renderer.regenerate();
    if (!ui.dragging) {
      ui.view.set(ctx);
      check = renderer.pointPath(ctx, ui.mouse);
      ui.mouseOver = check;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ui.size[0], ui.size[1]);
    ui.view.set(ctx);
    renderer.draw(ctx, ui.mouseOver);
    return makeDefinitionCanvases();
  };

  makeDefinitionCanvas = function() {
    var c, def;
    def = $("<div class='definition'><canvas></canvas></div>");
    $("#definitions").append(def);
    c = $("canvas", def);
    c.attr({
      width: c.width(),
      height: c.height()
    });
    return c[0];
  };

  makeDefinitionCanvases = function() {
    var canvases;
    canvases = $("#definitions canvas");
    return definitions.forEach(function(definition, i) {
      var c, cx, height, renderer, width;
      c = canvases[i];
      if (!c) c = makeDefinitionCanvas();
      if (ui.focus === definition) {
        $(c).parent().addClass("focused");
      } else {
        $(c).parent().removeClass("focused");
      }
      $(c).data("definition", definition);
      width = $(c).width();
      height = $(c).height();
      renderer = require("makeRenderer")(definition);
      renderer.regenerate();
      cx = c.getContext("2d");
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.clearRect(0, 0, width, height);
      require("model").makeTransform([width / 2, 0, 0, height / 2, width / 2, height / 2]).set(cx);
      return renderer.draw(cx, ui.mo);
    });
  };

  workspaceView = function() {
    return ui.view.mult(ui.focus.view);
  };

  combineComponents = function(componentPath) {
    var combined;
    return combined = componentPath.reduce(function(transform, component) {
      return transform.mult(component.transform);
    }, model.makeTransform());
  };

  localCoords = function(componentPath, point) {
    var combined;
    combined = workspaceView().mult(combineComponents(componentPath));
    return combined.inverse().p(point);
  };

  init();

  render();

}).call(this);
}, "config": function(exports, require, module) {(function() {

  module.exports = {
    edgeSize: 0.7,
    minScale: 0.1,
    maxScale: 1000000,
    expansionLimit: 300,
    minSize: 0.000001,
    maxSize: 8
  };

}).call(this);
}, "makeRenderer": function(exports, require, module) {(function() {
  var arrayEquals, makeRenderer;

  arrayEquals = function(a1, a2) {
    return a1.length === a2.length && a1.every(function(x, i) {
      return a2[i] === x;
    });
  };

  makeRenderer = function(definition) {
    var Tree, draws, expansionLimit, expansions, leaves, tree;
    draws = [];
    expansions = null;
    expansionLimit = null;
    leaves = null;
    tree = null;
    Tree = (function() {

      function Tree(transform, definition, parent, component) {
        this.transform = transform;
        this.definition = definition;
        this.parent = parent;
        this.component = component;
        if (this.parent && this.parent.c0) {
          this.c0 = this.parent.c0;
        } else {
          this.c0 = this.component;
        }
      }

      Tree.prototype.drewSomething = function() {
        if (!this.active) {
          this.active = true;
          if (this.parent) return this.parent.drewSomething();
        }
      };

      Tree.prototype.findAncestorWithComponent = function(c) {
        if (this.component === c) {
          return this;
        } else if (this.parent) {
          return this.parent.findAncestorWithComponent(c);
        } else {
          return false;
        }
      };

      Tree.prototype.expand = function() {
        var ancestor, component, scaleRange, t, _i, _len, _ref, _ref2, _results;
        if (this.definition.draw) {
          scaleRange = this.transform.scaleRange();
          if (scaleRange[0] > require("config").minSize && scaleRange[1] < require("config").maxSize) {
            draws.push(this);
            return this.drewSomething();
          }
        } else {
          ancestor = (_ref = this.parent) != null ? _ref.findAncestorWithComponent(this.component) : void 0;
          if (ancestor) {
            if (!ancestor.active) {
              leaves.push(this);
              return;
            }
          }
          expansions++;
          if (expansions > expansionLimit) {
            leaves.push(this);
            return;
          }
          this.children = [];
          _ref2 = this.definition.components;
          _results = [];
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            component = _ref2[_i];
            t = new Tree(this.transform.mult(component.transform), component.definition, this, component);
            this.children.push(t);
            _results.push(leaves.push(t));
          }
          return _results;
        }
      };

      Tree.prototype.componentPath = function() {
        if (this._memoComponentPath) return this._memoComponentPath;
        if (!this.parent) return this._memoComponentPath = [];
        return this._memoComponentPath = this.parent.componentPath().concat(this.component);
      };

      return Tree;

    })();
    return {
      regenerate: function() {
        var lastExpansions, oldLeaves, t, _i, _len, _results;
        expansions = 0;
        expansionLimit = require("config").expansionLimit;
        tree = new Tree(definition.view, definition);
        leaves = [tree];
        lastExpansions = expansions;
        _results = [];
        while (true) {
          oldLeaves = leaves;
          leaves = [];
          for (_i = 0, _len = oldLeaves.length; _i < _len; _i++) {
            t = oldLeaves[_i];
            t.expand();
          }
          if (lastExpansions === expansions) break;
          lastExpansions = expansions;
          if (expansions > expansionLimit) {
            break;
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      },
      draw: function(ctx, mouseOver) {
        var d, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = draws.length; _i < _len; _i++) {
          d = draws[_i];
          ctx.save();
          d.transform.app(ctx);
          ctx.beginPath();
          d.definition.draw(ctx);
          if (mouseOver && mouseOver.componentPath[0] === d.c0) {
            if (arrayEquals(mouseOver.componentPath, d.componentPath())) {
              ctx.fillStyle = "#900";
              ctx.fill();
              if (mouseOver.edge) {
                ctx.scale(require("config").edgeSize, require("config").edgeSize);
                ctx.beginPath();
                d.definition.draw(ctx);
                ctx.fillStyle = "#300";
                ctx.fill();
              }
            } else {
              ctx.fillStyle = "#300";
              ctx.fill();
            }
          } else {
            ctx.fillStyle = "black";
            ctx.fill();
          }
          _results.push(ctx.restore());
        }
        return _results;
      },
      pointPath: function(ctx, point) {
        var d, ret, _i, _len;
        ret = void 0;
        for (_i = 0, _len = draws.length; _i < _len; _i++) {
          d = draws[_i];
          ctx.save();
          d.transform.app(ctx);
          ctx.beginPath();
          d.definition.draw(ctx);
          if (ctx.isPointInPath.apply(ctx, point)) {
            ctx.scale(require("config").edgeSize, require("config").edgeSize);
            ctx.beginPath();
            d.definition.draw(ctx);
            if (ctx.isPointInPath.apply(ctx, point)) {
              ret = {
                componentPath: d.componentPath(),
                edge: false
              };
            } else {
              ret = {
                componentPath: d.componentPath(),
                edge: true
              };
            }
          }
          ctx.restore();
        }
        return ret;
      },
      drawFurther: function(ctx) {}
    };
  };

  module.exports = makeRenderer;

}).call(this);
}, "model": function(exports, require, module) {(function() {
  var Transform, combineComponents, makeComponent, makeCompoundDefinition, makeDefinition, makePrimitiveDefinition, makeTransform;

  Transform = (function() {

    function Transform(a) {
      this.a = a;
    }

    Transform.prototype.p = function(p) {
      return [this.a[0] * p[0] + this.a[2] * p[1] + this.a[4], this.a[1] * p[0] + this.a[3] * p[1] + this.a[5]];
    };

    Transform.prototype.scaleRange = function() {
      var a, b;
      a = this.a[0] * this.a[0] + this.a[1] * this.a[1];
      b = this.a[2] * this.a[2] + this.a[3] * this.a[3];
      return [Math.min(a, b), Math.max(a, b)];
    };

    Transform.prototype.area = function() {
      var diag1, diag2;
      diag1 = numeric['-'](this.p([1, 0]), this.p([-1, 0]));
      diag2 = numeric['-'](this.p([0, 1]), this.p([0, -1]));
      return Math.abs(diag1[0] * diag2[1] - diag2[0] * diag1[1]);
    };

    Transform.prototype.mult = function(transform) {
      var x, y;
      x = this.a;
      y = transform.a;
      return makeTransform([x[0] * y[0] + x[2] * y[1], x[1] * y[0] + x[3] * y[1], x[0] * y[2] + x[2] * y[3], x[1] * y[2] + x[3] * y[3], x[0] * y[4] + x[2] * y[5] + x[4], x[1] * y[4] + x[3] * y[5] + x[5]]);
    };

    Transform.prototype.inverse = function() {
      var a, b, c, d, e, f, x, _ref;
      if (this._memoInverse) return this._memoInverse;
      _ref = this.a, a = _ref[0], b = _ref[1], c = _ref[2], d = _ref[3], e = _ref[4], f = _ref[5];
      x = a * d - b * c;
      return this._memoInverse = makeTransform([d / x, -b / x, -c / x, a / x, (c * f - d * e) / x, (b * e - a * f) / x]);
    };

    Transform.prototype.set = function(ctx) {
      return ctx.setTransform.apply(ctx, this.a);
    };

    Transform.prototype.app = function(ctx) {
      return ctx.transform.apply(ctx, this.a);
    };

    return Transform;

  })();

  makeTransform = function(matrix) {
    if (matrix == null) matrix = [1, 0, 0, 1, 0, 0];
    return new Transform(matrix);
  };

  makeComponent = function(definition, transform) {
    var o;
    return o = {
      id: _.uniqueId("component"),
      definition: definition,
      transform: transform
    };
  };

  makeDefinition = function() {
    var o;
    return o = {
      view: makeTransform([0.4, 0, 0, 0.4, 0, 0])
    };
  };

  makePrimitiveDefinition = function(draw) {
    var o;
    o = makeDefinition();
    o.draw = draw;
    return o;
  };

  makeCompoundDefinition = function() {
    var o;
    o = makeDefinition();
    o.components = [];
    o.add = function(definition, transform) {
      var c;
      c = {
        transform: transform,
        definition: definition
      };
      o.components.push(c);
      return c;
    };
    return o;
  };

  combineComponents = function(componentPath) {
    var combined;
    return combined = componentPath.reduce(function(transform, component) {
      return transform.mult(component.transform);
    }, makeTransform());
  };

  module.exports = {
    makeTransform: makeTransform,
    makeComponent: makeComponent,
    makePrimitiveDefinition: makePrimitiveDefinition,
    makeCompoundDefinition: makeCompoundDefinition,
    combineComponents: combineComponents
  };

}).call(this);
}, "solveConstraint": function(exports, require, module) {(function() {
  var dist;

  dist = function(p1, p2) {
    var d;
    d = numeric['-'](p1, p2);
    return numeric.dot(d, d);
  };

  module.exports = function(components, originalMouse, originalCenter, mouse) {
    var c0, solve;
    c0 = components[0];
    solve = function(objective, argsToMatrix, startArgs) {
      var argsToNewC0Transform, error, obj, solution, t, uncmin;
      argsToNewC0Transform = function(args) {
        return require("model").makeTransform(argsToMatrix(args)).mult(c0.transform);
      };
      obj = function(args) {
        var newC0, newC0Transform, newComponents, totalTransform;
        newC0Transform = argsToNewC0Transform(args);
        newC0 = {
          transform: newC0Transform
        };
        newComponents = components.map(function(component) {
          if (component === c0) {
            return newC0;
          } else {
            return component;
          }
        });
        totalTransform = require("model").combineComponents(newComponents);
        return objective(totalTransform);
      };
      uncmin = numeric.uncmin(obj, startArgs);
      if (isNaN(uncmin.f)) {
        console.log("nan");
        return c0.transform;
      } else {
        error = obj(uncmin.solution);
        if (error > .000001) {
          console.log("error too big", error);
          return c0.transform;
        }
        window.debugSolver = {
          uncmin: uncmin,
          error: obj(uncmin.solution)
        };
        solution = uncmin.solution;
        t = argsToNewC0Transform(solution);
        if (t.area() < .001) {
          console.log("too small", t.a);
          return c0.transform;
        }
        return t;
      }
    };
    return {
      translate: function() {
        var objective;
        objective = function(transform) {
          var result;
          result = transform.p(originalMouse);
          return dist(result, mouse);
        };
        return solve(objective, (function(_arg) {
          var x, y;
          x = _arg[0], y = _arg[1];
          return [1, 0, 0, 1, x, y];
        }), [0, 0]);
      },
      scaleRotate: function() {
        var objective;
        objective = function(transform) {
          var e1, e2, result;
          result = transform.p(originalMouse);
          e1 = dist(result, mouse);
          result = transform.p([0, 0]);
          e2 = dist(result, originalCenter);
          return e1 + e2;
        };
        return solve(objective, (function(_arg) {
          var r, s, x, y;
          s = _arg[0], r = _arg[1], x = _arg[2], y = _arg[3];
          return [s, r, -r, s, x, y];
        }), [1, 0, 0, 0]);
      },
      scale: function() {
        var objective;
        objective = function(transform) {
          var e1, e2, result;
          result = transform.p(originalMouse);
          e1 = dist(result, mouse);
          result = transform.p([0, 0]);
          e2 = dist(result, originalCenter);
          return e1 + e2;
        };
        return solve(objective, (function(_arg) {
          var sx, sy, x, y;
          sx = _arg[0], sy = _arg[1], x = _arg[2], y = _arg[3];
          return [sx, 0, 0, sy, x, y];
        }), [1, 1, 0, 0]);
      }
    };
  };

}).call(this);
}});
