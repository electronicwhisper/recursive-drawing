
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
  var arrayEquals, canvasTopLevelTransform, circle, combineComponents, definitions, drawFurther, init, koState, lastRenderTime, localCoords, model, movedCircle, regenerateRenderers, render, setSize, sizeCanvas, square, startsWith, ui, workspaceCoords, workspaceView;

  model = require("model");

  circle = model.makePrimitiveDefinition(function(ctx) {
    return ctx.arc(0, 0, 1 * require("config").normalizeConstant, 0, Math.PI * 2);
  });

  square = model.makePrimitiveDefinition(function(ctx) {
    return ctx.rect(-1 * require("config").normalizeConstant, -1 * require("config").normalizeConstant, 2 * require("config").normalizeConstant, 2 * require("config").normalizeConstant);
  });

  window.movedCircle = movedCircle = model.makeCompoundDefinition();

  definitions = ko.observableArray([circle, square, movedCircle]);

  ui = {
    view: model.makeTransform([1, 0, 0, 1, 400, 300]),
    dragging: false
  };

  koState = window.koState = {
    test: movedCircle,
    definitions: definitions,
    focus: ko.observable(movedCircle),
    mouseOver: ko.observable(false)
  };

  sizeCanvas = function(canvas) {
    var height, parentDiv, width;
    canvas = $(canvas);
    parentDiv = canvas.parent();
    width = parentDiv.innerWidth();
    height = parentDiv.innerHeight();
    if (+canvas.attr("width") !== width || +canvas.attr("height") !== height) {
      return canvas.attr({
        width: width,
        height: height
      });
    }
  };

  canvasTopLevelTransform = function(canvas) {
    var height, minDimension, width;
    width = canvas.width;
    height = canvas.height;
    minDimension = Math.min(width, height);
    return require("model").makeTransform([minDimension / 2 / require("config").normalizeConstant, 0, 0, minDimension / 2 / require("config").normalizeConstant, width / 2, height / 2]);
  };

  ko.bindingHandlers.canvas = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
      return setSize();
    },
    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
      $(element).data("definition", valueAccessor());
      return render();
    }
  };

  ko.bindingHandlers.componentPath = {
    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
      $(element).data("componentPath", valueAccessor());
      return render();
    }
  };

  _.reverse = function(a) {
    var ret, x, _i, _len;
    ret = [];
    for (_i = 0, _len = a.length; _i < _len; _i++) {
      x = a[_i];
      ret.unshift(x);
    }
    return ret;
  };

  workspaceCoords = function(e) {
    var canvasPos;
    canvasPos = $("#workspaceCanvas").offset();
    return [e.clientX - canvasPos.left, e.clientY - canvasPos.top];
  };

  init = function() {
    var canvas, ctx;
    canvas = $("#workspaceCanvas");
    ctx = canvas[0].getContext('2d');
    regenerateRenderers();
    setSize();
    $(window).resize(setSize);
    $("#workspace").mouseenter(function(e) {
      var c, componentPath, mouse, pan, _ref;
      if ((_ref = ui.dragging) != null ? _ref.definition : void 0) {
        mouse = localCoords([], workspaceCoords(e));
        pan = ui.dragging.definition.view.inverse().p([0, 0]);
        c = koState.focus().add(ui.dragging.definition, model.makeTransform([1, 0, 0, 1, mouse[0] - pan[0], mouse[1] - pan[1]]));
        componentPath = [c];
        koState.mouseOver({
          componentPath: componentPath,
          edge: false
        });
        ui.dragging = {
          componentPath: componentPath,
          startPosition: localCoords(componentPath, workspaceCoords(e)),
          originalCenter: combineComponents(componentPath).p([0, 0])
        };
        regenerateRenderers();
        return render();
      }
    });
    $("#workspace").mousemove(function(e) {
      if (!ui.dragging) {
        ui.view.set(ctx);
        koState.mouseOver(koState.focus().renderer.pointPath(ctx, workspaceCoords(e)));
        return render();
      }
    });
    $("#workspace").mouseleave(function(e) {
      if (!ui.dragging && $("#context-menu-layer").length === 0) {
        koState.mouseOver(false);
        return render();
      }
    });
    $(window).mousemove(function(e) {
      var c0, components, constraintType, d, mouse;
      if (ui.dragging) {
        mouse = localCoords([], workspaceCoords(e));
        if (ui.dragging.pan) {
          d = numeric['-'](mouse, ui.dragging.pan);
          koState.focus().view = koState.focus().view.mult(model.makeTransform([1, 0, 0, 1, d[0], d[1]]));
        } else if (ui.dragging.componentPath) {
          components = ui.dragging.componentPath;
          c0 = components[0];
          constraintType = koState.mouseOver().edge ? (key.shift ? "scale" : "scaleRotate") : "translate";
          c0.transform = require("solveConstraint")(components, ui.dragging.startPosition, ui.dragging.originalCenter, mouse)[constraintType]();
        }
        regenerateRenderers();
        return render();
      }
    });
    $("#workspace").mousewheel(function(e, delta) {
      var scale, scaleFactor, scaleT, t1, t2, trans;
      scaleFactor = 1.1;
      scale = Math.pow(scaleFactor, delta);
      scaleT = model.makeTransform([scale, 0, 0, scale, 0, 0]);
      trans = ui.view.inverse().p(workspaceCoords(e));
      t1 = model.makeTransform([1, 0, 0, 1, trans[0], trans[1]]);
      t2 = model.makeTransform([1, 0, 0, 1, -trans[0], -trans[1]]);
      koState.focus().view = t1.mult(scaleT.mult(t2.mult(koState.focus().view)));
      regenerateRenderers();
      return render();
    });
    $(window).mousedown(function(e) {
      return e.preventDefault();
    });
    $("#workspace").mousedown(function(e) {
      var mo, newComponent, oldComponent;
      if (koState.mouseOver()) {
        if (key.command) {
          oldComponent = koState.mouseOver().componentPath[0];
          newComponent = koState.focus().add(oldComponent.definition, oldComponent.transform);
          mo = koState.mouseOver();
          mo.componentPath = mo.componentPath.map(function(c) {
            if (c === oldComponent) {
              return newComponent;
            } else {
              return c;
            }
          });
          koState.mouseOver(mo);
        }
        return ui.dragging = {
          componentPath: koState.mouseOver().componentPath,
          startPosition: localCoords(koState.mouseOver().componentPath, workspaceCoords(e)),
          originalCenter: combineComponents(koState.mouseOver().componentPath).p([0, 0])
        };
      } else {
        return ui.dragging = {
          pan: localCoords([], workspaceCoords(e))
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
      if (definition.draw) {} else {
        koState.focus(definition);
        return render();
      }
    });
    $("#addDefinition").on("click", function(e) {
      var newDef;
      newDef = model.makeCompoundDefinition();
      newDef.view = koState.focus().view;
      definitions.push(newDef);
      koState.focus(newDef);
      return setSize();
    });
    $.contextMenu({
      selector: "#workspace",
      build: function($trigger, e) {
        if (koState.mouseOver()) {
          return {
            items: {
              del: {
                name: "Delete Shape",
                callback: function() {
                  var c, i;
                  c = koState.mouseOver().componentPath[0];
                  i = koState.focus().components.indexOf(c);
                  koState.focus().components.splice(i, 1);
                  regenerateRenderers();
                  return render();
                }
              }
            }
          };
        } else {
          return false;
        }
      }
    });
    $(window).mouseup(function(e) {
      return ui.dragging = false;
    });
    ko.applyBindings(koState);
    return render();
  };

  setSize = function() {
    var aspectRatio;
    aspectRatio = $("#workspace").innerWidth() / $("#workspace").innerHeight();
    $(".mini").each(function() {
      return $(this).height($(this).width() / aspectRatio);
    });
    $("canvas").each(function() {
      return sizeCanvas(this);
    });
    ui.view = canvasTopLevelTransform($("#workspaceCanvas")[0]);
    return render();
  };

  regenerateRenderers = function() {
    return definitions().forEach(function(definition) {
      return definition.renderer.regenerate();
    });
  };

  arrayEquals = function(a1, a2) {
    return a1.length === a2.length && a1.every(function(x, i) {
      return a2[i] === x;
    });
  };

  startsWith = function(needle, haystack) {
    return needle.every(function(x, i) {
      return haystack[i] === x;
    });
  };

  lastRenderTime = Date.now();

  render = function() {
    return $("canvas").each(function() {
      var c0, canvas, componentPath, cp, cpUniform, ctx, definition, extraCp, lastC0Index, mouseOver, t;
      canvas = this;
      definition = $(canvas).data("definition");
      componentPath = $(canvas).data("componentPath");
      if (definition) {
        ctx = canvas.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "blue";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        canvasTopLevelTransform(canvas).set(ctx);
        extraCp = [];
        if (componentPath) {
          t = combineComponents(componentPath);
          t = definition.view.mult(t.mult(_.last(componentPath).definition.view.inverse()));
          t.app(ctx);
          definition = _.last(componentPath).definition;
          extraCp = componentPath;
        }
        mouseOver = koState.mouseOver();
        if (mouseOver) {
          cp = mouseOver.componentPath;
          c0 = cp[0];
          lastC0Index = cp.lastIndexOf(c0);
          cpUniform = cp.slice(0, lastC0Index + 1);
        }
        return definition.renderer.draw(ctx, function(ctx, draw, componentPath) {
          componentPath = extraCp.concat(componentPath);
          if (mouseOver && c0 === componentPath[0]) {
            if (startsWith(cpUniform, componentPath) && componentPath.lastIndexOf(c0) === lastC0Index) {
              ctx.fillStyle = "#900";
              ctx.fill();
              if (mouseOver.edge) {
                ctx.scale(require("config").edgeSize, require("config").edgeSize);
                ctx.beginPath();
                draw(ctx);
                ctx.fillStyle = "#600";
                return ctx.fill();
              }
            } else {
              ctx.fillStyle = "#600";
              return ctx.fill();
            }
          } else {
            ctx.fillStyle = "black";
            return ctx.fill();
          }
        });
      }
    });
  };

  drawFurther = window.drawFurther = function() {
    var ctx;
    if (Date.now() - lastRenderTime > require("config").fillInTime) {
      ctx = $("#workspaceCanvas")[0].getContext('2d');
      ui.view.set(ctx);
      return koState.focus().renderer.drawFurther(ctx);
    }
  };

  workspaceView = function() {
    return ui.view.mult(koState.focus().view);
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

  module.exports = init;

}).call(this);
}, "config": function(exports, require, module) {(function() {

  module.exports = {
    edgeSize: 0.7,
    expansionLimit: 300,
    minSize: 0.0000002,
    maxSize: 8,
    fillInTime: 1800,
    leafLimit: 1000000,
    normalizeConstant: 200
  };

}).call(this);
}, "extras": function(exports, require, module) {(function() {

  module.exports = {
    stats: function() {
      var stats;
      stats = new Stats();
      stats.getDomElement().style.position = 'absolute';
      stats.getDomElement().style.left = '0px';
      stats.getDomElement().style.bottom = '0px';
      document.body.appendChild(stats.getDomElement());
      return setInterval((function() {
        return stats.update();
      }), 1000 / 60);
    }
  };

}).call(this);
}, "makeRenderer": function(exports, require, module) {(function() {
  var arrayEquals, makeRenderer, startsWith;

  arrayEquals = function(a1, a2) {
    return a1.length === a2.length && a1.every(function(x, i) {
      return a2[i] === x;
    });
  };

  startsWith = function(needle, haystack) {
    return needle.every(function(x, i) {
      return haystack[i] === x;
    });
  };

  makeRenderer = function(definition) {
    var Tree, draws, expandLoop, expansionLimit, expansions, leaves;
    draws = [];
    expansions = null;
    expansionLimit = null;
    leaves = [];
    Tree = (function() {

      function Tree(transform, definition, parent, component) {
        this.transform = transform;
        this.definition = definition;
        this.parent = parent;
        this.component = component;
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
        if (expansions >= expansionLimit) {
          leaves.push(this);
          return;
        }
        if (this.definition.draw) {
          scaleRange = this.transform.scaleRange();
          if (scaleRange[0] > require("config").minSize && scaleRange[1] < require("config").maxSize) {
            draws.push(this);
            expansions++;
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
          _ref2 = this.definition.components();
          _results = [];
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            component = _ref2[_i];
            t = new Tree(this.transform.mult(component.transform), component.definition, this, component);
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
    expandLoop = function() {
      var i, lastExpansions, oldLeaves, t, _len, _results;
      _results = [];
      while (true) {
        if (leaves.length > require("config").leafLimit) break;
        oldLeaves = leaves;
        leaves = [];
        lastExpansions = expansions;
        for (i = 0, _len = oldLeaves.length; i < _len; i++) {
          t = oldLeaves[i];
          if (expansions >= expansionLimit) {
            leaves = oldLeaves.slice(i).concat(leaves);
            break;
          }
          t.expand();
        }
        if (expansions >= expansionLimit) break;
        if (lastExpansions === expansions) {
          break;
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };
    return {
      regenerate: function() {
        var tree;
        draws = [];
        expansions = 0;
        expansionLimit = require("config").expansionLimit;
        tree = new Tree(definition.view, definition);
        leaves = [tree];
        return expandLoop();
      },
      draw: function(ctx, drawCallback) {
        var d, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = draws.length; _i < _len; _i++) {
          d = draws[_i];
          ctx.save();
          d.transform.app(ctx);
          ctx.beginPath();
          d.definition.draw(ctx);
          drawCallback(ctx, d.definition.draw, d.componentPath());
          _results.push(ctx.restore());
        }
        return _results;
      },
      drawFurther: function(ctx) {
        var d, newDraws, originalDrawsLength, _i, _len, _results;
        if (expansions === expansionLimit) {
          originalDrawsLength = draws.length;
          expansions = 0;
          expandLoop();
          newDraws = draws.splice(originalDrawsLength);
          _results = [];
          for (_i = 0, _len = newDraws.length; _i < _len; _i++) {
            d = newDraws[_i];
            ctx.save();
            d.transform.app(ctx);
            ctx.beginPath();
            d.definition.draw(ctx);
            ctx.fillStyle = "black";
            ctx.fill();
            _results.push(ctx.restore());
          }
          return _results;
        }
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
      }
    };
  };

  module.exports = makeRenderer;

}).call(this);
}, "model": function(exports, require, module) {(function() {
  var Transform, arrayEquals, combineComponents, makeComponent, makeCompoundDefinition, makeDefinition, makePrimitiveDefinition, makeTransform;

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

  arrayEquals = function(a1, a2) {
    return a1.length === a2.length && a1.every(function(x, i) {
      return a2[i] === x;
    });
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
    o = {
      view: makeTransform([0.4, 0, 0, 0.4, 0, 0])
    };
    o.renderer = require("makeRenderer")(o);
    return o;
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
    o.components = ko.observableArray([]);
    o.ui = {
      expanded: ko.observableArray([]),
      isExpanded: function(componentPath) {
        return !(_.last(componentPath).definition.draw != null) && o.ui.expanded().some(function(a) {
          return arrayEquals(a, componentPath);
        });
      },
      isCollapsed: function(componentPath) {
        return !(_.last(componentPath).definition.draw != null) && !o.ui.expanded().some(function(a) {
          return arrayEquals(a, componentPath);
        });
      },
      toggleExpanded: function(data) {
        var componentPath, removed;
        componentPath = data.componentPath;
        removed = o.ui.expanded.remove(function(a) {
          return arrayEquals(a, componentPath);
        });
        if (removed.length === 0) return o.ui.expanded.push(componentPath);
      },
      debug: function(data) {
        console.log("data", data);
        return window.debug = data;
      }
    };
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
