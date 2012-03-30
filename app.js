
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
  var canvas, circle, combineComponents, ctx, definitions, init, localCoords, makeDefinitionCanvas, makeDefinitionCanvases, model, movedCircle, render, renderDraws, setSize, square, ui;

  model = require("model");

  circle = model.makePrimitiveDefinition(function(ctx) {
    return ctx.arc(0, 0, 1, 0, Math.PI * 2);
  });

  square = model.makePrimitiveDefinition(function(ctx) {
    return ctx.rect(-1, -1, 2, 2);
  });

  window.movedCircle = movedCircle = model.makeCompoundDefinition();

  movedCircle.add(circle, model.makeTransform([0.3, 0, 0, 0.3, 0, 0]));

  movedCircle.add(movedCircle, model.makeTransform([0.6, 0, 0, 0.6, 0.5, 0]));

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
    canvas = $("#main");
    ctx = canvas[0].getContext('2d');
    setSize();
    $(window).resize(setSize);
    $(window).mousemove(function(e) {
      var c0, canvasPos, components, mouse, t;
      canvasPos = canvas.offset();
      ui.mouse = [e.clientX - canvasPos.left, e.clientY - canvasPos.top];
      if (ui.dragging) {
        components = ui.mouseOver;
        c0 = components[0];
        mouse = ui.view.inverse().p(ui.mouse);
        if (!ui.mouseOverEdge) {
          t = require("solveConstraint")(components, ui.dragging.startPosition, ui.dragging.originalCenter, mouse).translate();
          c0.transform = t;
        } else {
          t = require("solveConstraint")(components, ui.dragging.startPosition, ui.dragging.originalCenter, mouse).scaleRotate();
          c0.transform = t;
        }
      }
      return render();
    });
    $(window).mousedown(function(e) {
      if (ui.mouseOver) {
        ui.dragging = {
          componentPath: ui.mouseOver,
          startPosition: localCoords(ui.mouseOver, ui.mouse),
          originalCenter: combineComponents(ui.mouseOver).p([0, 0])
        };
      }
      return e.preventDefault();
    });
    return $(window).mouseup(function(e) {
      return ui.dragging = false;
    });
  };

  setSize = function() {
    var minDimension, windowSize;
    ui.size = windowSize = [$(window).width(), $(window).height()];
    canvas.attr({
      width: windowSize[0],
      height: windowSize[1]
    });
    minDimension = Math.min(windowSize[0], windowSize[1]);
    ui.view = model.makeTransform([minDimension / 2, 0, 0, minDimension / 2, windowSize[0] / 2, windowSize[1] / 2]);
    require("config").maxScale = windowSize[0] * windowSize[1];
    return render();
  };

  renderDraws = function(draws, ctx) {
    return draws.forEach(function(d) {
      var _ref;
      ctx.save();
      d.transform.app(ctx);
      ctx.beginPath();
      d.draw(ctx);
      if (d.componentPath[0] === ((_ref = ui.mouseOver) != null ? _ref[0] : void 0)) {
        if (d.componentPath.every(function(component, i) {
          return component === ui.mouseOver[i];
        })) {
          ctx.fillStyle = "#900";
          ctx.fill();
          if (ui.mouseOverEdge) {
            ctx.save();
            ctx.scale(require("config").edgeSize, require("config").edgeSize);
            ctx.beginPath();
            d.draw(ctx);
            ctx.fillStyle = "#300";
            ctx.fill();
            ctx.restore();
          }
        } else {
          ctx.fillStyle = "#300";
          ctx.fill();
        }
      } else {
        ctx.fillStyle = "black";
        ctx.fill();
      }
      return ctx.restore();
    });
  };

  render = function() {
    var check, draws;
    draws = require("generateDraws")(ui.focus, ui.view);
    if (!ui.dragging) {
      check = require("checkMouseOver")(draws, ctx, ui.mouse);
      if (check) {
        ui.mouseOver = check.componentPath;
        ui.mouseOverEdge = check.edge;
      } else {
        ui.mouseOver = false;
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ui.size[0], ui.size[1]);
    renderDraws(draws, ctx);
    return makeDefinitionCanvases();
  };

  makeDefinitionCanvas = function() {
    return $("<canvas>").attr({
      width: 100,
      height: 100
    })[0];
  };

  makeDefinitionCanvases = function() {
    var canvases;
    canvases = $("#definitions canvas");
    return definitions.forEach(function(definition, i) {
      var c, cx, draws;
      c = canvases[i];
      if (!c) {
        c = makeDefinitionCanvas();
        $("#definitions").append(c);
      }
      draws = require("generateDraws")(definition, require("model").makeTransform([30, 0, 0, 30, 50, 50]));
      cx = c.getContext("2d");
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.clearRect(0, 0, 100, 100);
      return renderDraws(draws, cx);
    });
  };

  combineComponents = function(componentPath) {
    var combined;
    return combined = componentPath.reduce(function(transform, component) {
      return transform.mult(component.transform);
    }, model.makeTransform());
  };

  localCoords = function(componentPath, point) {
    var combined;
    combined = ui.view.mult(combineComponents(componentPath));
    return combined.inverse().p(point);
  };

  init();

  render();

}).call(this);
}, "checkMouseOver": function(exports, require, module) {(function() {

  module.exports = function(draws, ctx, mousePosition) {
    var ret;
    ret = void 0;
    draws.forEach(function(d) {
      d.transform.set(ctx);
      ctx.beginPath();
      d.draw(ctx);
      if (ctx.isPointInPath.apply(ctx, mousePosition)) {
        ctx.scale(require("config").edgeSize, require("config").edgeSize);
        ctx.beginPath();
        d.draw(ctx);
        if (ctx.isPointInPath.apply(ctx, mousePosition)) {
          return ret = {
            componentPath: d.componentPath,
            edge: false
          };
        } else {
          return ret = {
            componentPath: d.componentPath,
            edge: true
          };
        }
      }
    });
    return ret;
  };

}).call(this);
}, "config": function(exports, require, module) {(function() {

  module.exports = {
    edgeSize: 0.7,
    minScale: 0.1,
    maxScale: 1000000
  };

}).call(this);
}, "generateDraws": function(exports, require, module) {(function() {

  module.exports = function(definition, initialTransform) {
    var draws, i, process, queue;
    if (definition.draw) {
      return [
        {
          transform: initialTransform,
          draw: definition.draw,
          componentPath: []
        }
      ];
    } else {
      queue = [];
      draws = [];
      process = function(definition, transform, componentPath) {
        var somethingNew, toAdd;
        if (componentPath == null) componentPath = [];
        toAdd = [];
        somethingNew = false;
        definition.components.forEach(function(component) {
          var c, d, scaleRange, t;
          d = component.definition;
          t = transform.mult(component.transform);
          c = componentPath.concat(component);
          if (d.draw) {
            scaleRange = t.scaleRange();
            if (scaleRange[0] < require("config").minScale || scaleRange[1] > require("config").maxScale) {
              return;
            }
            draws.push({
              transform: t,
              draw: d.draw,
              componentPath: c
            });
            return somethingNew = true;
          } else {
            if (componentPath.indexOf(component) === -1) somethingNew = true;
            return toAdd.push([d, t, c]);
          }
        });
        if (somethingNew) return queue = queue.concat(toAdd);
      };
      queue.push([definition, initialTransform]);
      i = 0;
      while (i < 1000) {
        if (!queue[i]) break;
        process.apply(null, queue[i]);
        i++;
      }
      return draws;
    }
  };

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
      view: makeTransform()
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
      return o.components.push({
        transform: transform,
        definition: definition
      });
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
      var argsToNewC0Transform, obj, solution, t, uncmin;
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
      window.debug = uncmin = numeric.uncmin(obj, startArgs);
      if (isNaN(uncmin.f)) {
        console.log("nan");
        return c0.transform;
      } else {
        solution = uncmin.solution;
        t = argsToNewC0Transform(solution);
        if (t.scaleRange()[0] < .0001) {
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
