model = require("model")


circle = model.makePrimitiveDefinition (ctx) -> ctx.arc(0, 0, 1, 0, Math.PI*2)
square = model.makePrimitiveDefinition (ctx) -> ctx.rect(-1, -1, 2, 2)

window.movedCircle = movedCircle = model.makeCompoundDefinition()


definitions = [circle, square, movedCircle]



ui = {
  focus: movedCircle # current definition we're looking at
  view: model.makeTransform([1,0,0,1,400,300]) # top level transform so as to make 0,0 the center and 1,0 or 0,1 be the edge (of the browser viewport)
  size: [100, 100]
  mouse: [100, 100]
  mouseOver: [] # a component path
  mouseOverEdge: false # whether the mouse is on the edge of the shape (i.e. not near the center)
  dragging: false
}


canvas = null
ctx = null
init = () ->
  canvas = $("#main")
  
  ctx = canvas[0].getContext('2d')
  
  setSize()
  $(window).resize(setSize)
  
  
  $(window).mousemove (e) ->
    canvasPos = canvas.offset()
    ui.mouse = [e.clientX - canvasPos.left, e.clientY - canvasPos.top]
    
    if ui.dragging
      if ui.dragging.pan
        mouse = localCoords([], ui.mouse)
        d = numeric['-'](mouse, ui.dragging.pan)
        
        ui.focus.view = ui.focus.view.mult(model.makeTransform([1,0,0,1,d[0],d[1]]))
      
      else if ui.dragging.definition && e.target == canvas[0]
        mouse = localCoords([], ui.mouse)
        
        # create a component
        c = ui.focus.add(ui.dragging.definition, model.makeTransform([1, 0, 0, 1, mouse[0], mouse[1]]))
        
        # start dragging it
        # ui.mouseOver = [c]
        # ui.mouseOverEdge = false
        ui.mouseOver = {
          componentPath: [c]
          edge: false
          # TODO: needs tree
        }
        
        $("#workspace canvas").mousedown()
      
      else if ui.dragging.componentPath
        # here's the constraint problem:
        # we need to adjust the transformation of first component of the component path ui.mouseOver
        # so that the current ui.mouse, when viewed in local coordinates, is STILL ui.dragging.startPosition
        
        components = ui.dragging.componentPath # [C0, C1, ...]
        c0 = components[0]
        
        mouse = localCoords([], ui.mouse)
        
        constraintType = if ui.mouseOver.edge then (if key.shift then "scale" else "scaleRotate") else "translate"
        
        c0.transform = require("solveConstraint")(components, ui.dragging.startPosition, ui.dragging.originalCenter, mouse)[constraintType]()
    
    render()
  
  $("#workspace").mousewheel (e, delta) ->
    scaleFactor = 1.1
    scale = Math.pow(scaleFactor, delta)
    scaleT = model.makeTransform([scale,0,0,scale,0,0])
    
    trans = ui.view.inverse().p(ui.mouse)
    
    t1 = model.makeTransform([1,0,0,1,trans[0],trans[1]])
    t2 = model.makeTransform([1,0,0,1,-trans[0],-trans[1]])
    
    ui.focus.view = t1.mult(scaleT.mult(t2.mult(ui.focus.view)))
    render()
  
  
  $(window).mousedown (e) ->
    e.preventDefault() # so you don't start selecting text
  
  $("#workspace canvas").mousedown (e) ->
    if ui.mouseOver
      ui.dragging = {
        componentPath: ui.mouseOver.componentPath
        startPosition: localCoords(ui.mouseOver.componentPath, ui.mouse)
        originalCenter: combineComponents(ui.mouseOver.componentPath).p([0, 0])
      }
    else
      ui.dragging = {
        pan: localCoords([], ui.mouse)
      }
  
  $("#definitions").on "mousedown", "canvas", (e) ->
    definition = $(this).data("definition")
    ui.dragging = {
      definition: definition
    }
  
  $("#definitions").on "click", "canvas", (e) ->
    definition = $(this).data("definition")
    ui.focus = definition
    render()
  
  $("#addDefinition").on "click", (e) ->
    newDef = model.makeCompoundDefinition()
    definitions.push(newDef)
    ui.focus = newDef
    render()
  
  
  
  
  $(window).mouseup (e) ->
    ui.dragging = false
  
  
  
  
  # set up stats
  stats = new Stats();
  
  stats.getDomElement().style.position = 'absolute'
  stats.getDomElement().style.left = '0px'
  stats.getDomElement().style.bottom = '0px'
  
  document.body.appendChild( stats.getDomElement() )
  setInterval((() -> stats.update()), 1000/60)
  

setSize = () ->
  ui.size = windowSize = [$(canvas).width(), $(canvas).height()]
  canvas.attr({width: windowSize[0], height: windowSize[1]})
  
  minDimension = Math.min(windowSize[0], windowSize[1])
  ui.view = model.makeTransform([minDimension/2, 0, 0, minDimension/2, windowSize[0]/2, windowSize[1]/2])
  
  require("config").maxScale = windowSize[0] * windowSize[1]
  
  render()







render = () ->
  
  
  renderer = require("makeRenderer")(ui.focus)
  renderer.regenerate()
  
  
  if !ui.dragging
    ui.view.set(ctx)
    check = renderer.pointPath(ctx, ui.mouse)
    ui.mouseOver = check
    # if check
    #   ui.mouseOver = check.componentPath
    #   ui.mouseOverEdge = check.edge
    #   ui.mo = check
    # else
    #   ui.mouseOver = false
  
  # clear the canvas
  ctx.setTransform(1,0,0,1,0,0)
  ctx.clearRect(0, 0, ui.size[0], ui.size[1])
  
  ui.view.set(ctx)
  renderer.draw(ctx, ui.mouseOver)
  
  makeDefinitionCanvases()



makeDefinitionCanvas = () ->
  def = $("<div class='definition'><canvas></canvas></div>")
  $("#definitions").append(def)
  c = $("canvas", def)
  c.attr({width: c.width(), height: c.height()})
  c[0]

makeDefinitionCanvases = () ->
  canvases = $("#definitions canvas")
  definitions.forEach (definition, i) ->
    c = canvases[i]
    if !c
      c = makeDefinitionCanvas()
    
    if ui.focus == definition
      $(c).parent().addClass("focused")
    else
      $(c).parent().removeClass("focused")
    $(c).data("definition", definition)
    
    width = $(c).width()
    height = $(c).height()
    
    renderer = require("makeRenderer")(definition)
    renderer.regenerate()
    cx = c.getContext("2d")
    cx.setTransform(1,0,0,1,0,0)
    cx.clearRect(0,0,width,height)
    require("model").makeTransform([width/2, 0, 0, height/2, width/2, height/2]).set(cx)
    
    renderer.draw(cx, ui.mo)



workspaceView = () ->
  ui.view.mult(ui.focus.view)



combineComponents = (componentPath) ->
  combined = componentPath.reduce((transform, component) ->
    transform.mult(component.transform)
  , model.makeTransform())

localCoords = (componentPath, point) ->
  combined = workspaceView().mult(combineComponents(componentPath))
  combined.inverse().p(point)


init()
render()