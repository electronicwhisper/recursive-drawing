
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
  var arrayEquals, canvasTopLevelTransform, circle, clearCanvas, combineComponents, definitions, domCompensate, drawFurther, init, koState, localCoords, model, movedCircle, regenerateRenderers, render, setSize, sizeCanvas, square, startsWith, triangle, ui, workspaceCoords, workspaceView;

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

  model = require("model");

  circle = model.makePrimitiveDefinition(function(ctx) {
    return ctx.arc(0, 0, 1 * require("config").normalizeConstant, 0, Math.PI * 2);
  });

  square = model.makePrimitiveDefinition(function(ctx) {
    return ctx.rect(-1 * require("config").normalizeConstant, -1 * require("config").normalizeConstant, 2 * require("config").normalizeConstant, 2 * require("config").normalizeConstant);
  });

  triangle = model.makePrimitiveDefinition(function(ctx) {
    var n;
    n = require("config").normalizeConstant;
    ctx.moveTo(0, -n * 2 * Math.sqrt(3) / 3);
    ctx.lineTo(n, n / Math.sqrt(3));
    ctx.lineTo(-n, n / Math.sqrt(3));
    return ctx.lineTo(0, -n * 2 * Math.sqrt(3) / 3);
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
    mouseOver: ko.observable(false),
    ghostHint: ko.observable(false),
    isHighlighted: function(componentPath) {
      var mo;
      mo = koState.mouseOver();
      if (mo) {
        if (koState.focus().ui.isExpanded(componentPath)) {
          return arrayEquals(componentPath, mo.componentPath);
        } else {
          return startsWith(componentPath, mo.componentPath);
        }
      }
    },
    children: function(definition, componentPath) {
      if (componentPath.length > 0) {
        return _.last(componentPath).definition.components();
      } else {
        return definition.components();
      }
    }
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

  clearCanvas = function(canvas) {
    var ctx;
    ctx = canvas.getContext("2d");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return ctx.restore();
  };

  ko.bindingHandlers.canvas = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
      var aspectRatio;
      $(element).data("definition", valueAccessor());
      aspectRatio = $("#workspace").innerWidth() / $("#workspace").innerHeight();
      $(".mini").each(function() {
        return $(this).height($(this).width() / aspectRatio);
      });
      return sizeCanvas(element);
    },
    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
      return $(element).data("definition", valueAccessor());
    }
  };

  ko.bindingHandlers.componentPath = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
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

  domCompensate = function(e, element) {
    var canvasPos;
    canvasPos = $(element).offset();
    return [e.clientX - canvasPos.left, e.clientY - canvasPos.top];
  };

  workspaceCoords = function(e) {
    return domCompensate(e, $("#workspaceCanvas"));
  };

  init = function() {
    var animloop, canvas, ctx;
    ko.applyBindings(koState);
    canvas = $("#workspaceCanvas");
    ctx = canvas[0].getContext('2d');
    regenerateRenderers();
    setSize();
    $(window).resize(setSize);
    $("#workspace").mouseenter(function(e) {
      var c, componentPath, mouse, t, _ref;
      if ((_ref = ui.dragging) != null ? _ref.definition : void 0) {
        koState.ghostHint(false);
        mouse = localCoords([], workspaceCoords(e));
        t = model.makeTransform([1, 0, 0, 1, mouse[0] - ui.dragging.dragPoint[0], mouse[1] - ui.dragging.dragPoint[1]]);
        c = koState.focus().add(ui.dragging.definition, t);
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
      if (koState.ghostHint()) {
        $("#ghostHint").css({
          top: e.clientY - koState.ghostHint()[1],
          left: e.clientX - koState.ghostHint()[0]
        });
      }
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
        if (ui.dragging.pan || ui.dragging.componentPath) {
          regenerateRenderers();
          return render();
        }
      }
    });
    $("#workspace").mousewheel(function(e, delta) {
      var scale, scaleFactor, scaleT, t1, t2, trans;
      delta = Math.min(Math.max(delta, -require("config").mouseDeltaLimit), require("config").mouseDeltaLimit);
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
    $(window).on("mousedown", function(e) {
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
    $("#dragHint").on("mousedown", function(e) {
      return console.log("dragHint mousedown");
    });
    $("#definitions").on("mousedown", ".definition", function(e) {
      var definition, dragPoint, offset;
      canvas = $(this).find("canvas")[0];
      definition = $(canvas).data("definition");
      dragPoint = canvasTopLevelTransform(canvas).mult(definition.view).inverse().p(domCompensate(e, canvas));
      ui.dragging = {
        definition: definition,
        dragPoint: dragPoint
      };
      $("#ghostHint canvas").data("definition", definition);
      render();
      offset = $(this).offset();
      $("#ghostHint").css({
        top: offset.top,
        left: offset.left
      });
      return koState.ghostHint([e.clientX - offset.left, e.clientY - offset.top]);
    });
    $("#definitions").on("click", ".definition", function(e) {
      var definition;
      canvas = $(this).find("canvas")[0];
      definition = $(canvas).data("definition");
      if (definition.draw) {
        $("#dragHint").css({
          left: $(canvas).offset().left + $(canvas).outerWidth(),
          top: $(canvas).offset().top,
          opacity: 0.7
        });
        return $("#dragHint").animate({
          opacity: 0.7
        }, 900, function() {
          return $("#dragHint").animate({
            opacity: 0
          }, 300);
        });
      } else {
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
    $("#sidebarRight").on("mouseenter", ".component", function(e) {
      var cp, data;
      data = ko.dataFor(this);
      cp = data.componentPath;
      if (cp.length > 0) {
        koState.mouseOver({
          componentPath: cp,
          edge: false,
          highlightOnly: true
        });
        return render();
      }
    });
    $("#sidebarRight").on("mouseleave", ".component", function(e) {
      koState.mouseOver(false);
      return render();
    });
    $.contextMenu({
      selector: "#workspace",
      zIndex: 20,
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
      ui.dragging = false;
      return koState.ghostHint(false);
    });
    render();
    koState.focus.subscribe(function() {
      return regenerateRenderers();
    });
    animloop = function() {
      requestAnimationFrame(animloop);
      return drawFurther();
    };
    return animloop();
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
    regenerateRenderers();
    return render();
  };

  regenerateRenderers = function() {
    clearCanvas($("#drawFurther")[0]);
    return definitions().forEach(function(definition) {
      return definition.renderer.regenerate();
    });
  };

  render = function() {
    return $("canvas").each(function() {
      var c0, canvas, componentPath, cp, cpUniform, ctx, definition, extraCp, lastC0Index, mouseOver, t;
      canvas = this;
      definition = $(canvas).data("definition");
      componentPath = $(canvas).data("componentPath");
      if (definition) {
        clearCanvas(canvas);
        ctx = canvas.getContext("2d");
        canvasTopLevelTransform(canvas).set(ctx);
        extraCp = [];
        if (componentPath && componentPath.length > 0) {
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
          if (mouseOver && mouseOver.highlightOnly && startsWith(mouseOver.componentPath, componentPath)) {
            ctx.fillStyle = "#900";
            return ctx.fill();
          } else if (mouseOver && !mouseOver.highlightOnly && c0 === componentPath[0]) {
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
    ctx = $("#drawFurther")[0].getContext('2d');
    ui.view.set(ctx);
    return koState.focus().renderer.drawFurther(ctx);
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
    normalizeConstant: 200,
    mouseDeltaLimit: 2.8
  };

}).call(this);
}, "export": function(exports, require, module) {(function() {
  var makePng;

  makePng = function() {
    var canvas, ctx, dataURL;
    canvas = $("#forSaving")[0];
    ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage($("#workspaceCanvas")[0], 0, 0);
    ctx.drawImage($("#drawFurther")[0], 0, 0);
    dataURL = canvas.toDataURL('image/png;base64');
    return window.open(dataURL);
  };

  module.exports = {
    makePng: makePng
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
  var arrayEquals, makeRenderer, startsWith, statuses;

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

  statuses = {
    tooSmall: {},
    tooBig: {},
    drawn: {}
  };

  makeRenderer = function(definition) {
    var Tree, draws, expandLoop, expansionLimit, expansions, leaves;
    draws = [];
    expansions = null;
    expansionLimit = require("config").expansionLimit;
    leaves = [];
    Tree = (function() {

      function Tree(transform, definition, parent, component) {
        this.transform = transform;
        this.definition = definition;
        this.parent = parent;
        this.component = component;
      }

      Tree.prototype.setStatus = function(status) {
        if (this.status !== statuses.drawn) {
          this.status = status;
          if (this.parent) return this.parent.setStatus(status);
        }
      };

      Tree.prototype.findAncestorWithComponent = function(c, n) {
        if (n == null) n = 0;
        if (n > 50) {
          return false;
        } else if (this.component === c) {
          return this;
        } else if (this.parent) {
          return this.parent.findAncestorWithComponent(c, n + 1);
        } else {
          return false;
        }
      };

      Tree.prototype.expand = function() {
        var ancestor, component, postpone, scaleRange, t, _i, _len, _ref, _ref2, _results;
        if (expansions >= expansionLimit) {
          leaves.push(this);
          return;
        }
        expansions++;
        if (this.definition.draw) {
          scaleRange = this.transform.scaleRange();
          if (scaleRange[0] < require("config").minSize) {
            return this.setStatus(statuses.tooSmall);
          } else if (scaleRange[1] > require("config").maxSize) {
            return this.setStatus(statuses.tooBig);
          } else {
            draws.push(this);
            return this.setStatus(statuses.drawn);
          }
        } else {
          ancestor = (_ref = this.parent) != null ? _ref.findAncestorWithComponent(this.component) : void 0;
          if (ancestor) {
            postpone = false;
            if (ancestor.status === statuses.tooSmall) {
              if (!(this.transform.scaleRange()[0] > ancestor.transform.scaleRange()[0])) {
                postpone = true;
              }
            } else if (ancestor.status === statuses.tooBig) {
              if (!(this.transform.scaleRange()[1] < ancestor.transform.scaleRange()[1])) {
                postpone = true;
              }
            } else if (!(ancestor.status != null)) {
              postpone = true;
            }
            if (postpone) {
              leaves.push(this);
              return;
            }
          }
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
      if (this._memoScaleRange) return this._memoScaleRange;
      a = this.a[0] * this.a[0] + this.a[1] * this.a[1];
      b = this.a[2] * this.a[2] + this.a[3] * this.a[3];
      return this._memoScaleRange = [Math.min(a, b), Math.max(a, b)];
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
        if (componentPath.length > 0) {
          return !(_.last(componentPath).definition.draw != null) && o.ui.expanded().some(function(a) {
            return arrayEquals(a, componentPath);
          });
        } else {
          return true;
        }
      },
      isCollapsed: function(componentPath) {
        if (componentPath.length > 0) {
          return !(_.last(componentPath).definition.draw != null) && !o.ui.expanded().some(function(a) {
            return arrayEquals(a, componentPath);
          });
        } else {
          return false;
        }
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
