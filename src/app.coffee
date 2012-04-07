model = require("model")


circle = model.makePrimitiveDefinition (ctx) -> ctx.arc(0, 0, 1, 0, Math.PI*2)
square = model.makePrimitiveDefinition (ctx) -> ctx.rect(-1, -1, 2, 2)

window.movedCircle = movedCircle = model.makeCompoundDefinition()


definitions = [circle, square, movedCircle]


ui = {
  focus: movedCircle # current definition we're looking at
  view: model.makeTransform([1,0,0,1,400,300]) # top level transform so as to make 0,0 the center and 1,0 or 0,1 be the edge (of the browser viewport)
  size: [100, 100]
  mouseOver: false # an object {componentPath: [c0, c1, ...], edge: Boolean}
  dragging: false # an object, either {definition}, {pan}, or {componentPath, startPosition, originalCenter}
}


canvas = null
ctx = null


workspaceCoords = (e) ->
  # takes an event's clientX and clientY and returns a point [x,y] where the mouse is relative to the workspace canvas
  canvasPos = $("#workspace canvas").offset()
  [e.clientX - canvasPos.left, e.clientY - canvasPos.top]


init = () ->
  canvas = $("#main")
  
  ctx = canvas[0].getContext('2d')
  
  regenerateRenderers()
  
  setSize()
  
  # Set up events
  
  $(window).resize(setSize)
  
  $("#workspace").mouseenter (e) ->
    if ui.dragging?.definition
      # create a new component in the focused definition
      mouse = localCoords([], workspaceCoords(e))
      c = ui.focus.add(ui.dragging.definition, model.makeTransform([1, 0, 0, 1, mouse[0], mouse[1]]))
      
      # start dragging it
      ui.mouseOver = {
        componentPath: [c]
        edge: false
      }
      ui.dragging = {
        componentPath: ui.mouseOver.componentPath
        startPosition: localCoords(ui.mouseOver.componentPath, workspaceCoords(e))
        originalCenter: combineComponents(ui.mouseOver.componentPath).p([0, 0])
      }
      
      regenerateRenderers()
      render()
  
  $("#workspace").mousemove (e) ->
    if !ui.dragging
      # check if we're hovering over a shape
      ui.view.set(ctx)
      ui.mouseOver = ui.focus.renderer.pointPath(ctx, workspaceCoords(e))
      
      render()
  
  $("#workspace").mouseleave (e) ->
    if !ui.dragging
      ui.mouseOver = false
      render()
  
  $(window).mousemove (e) ->
    if ui.dragging
      mouse = localCoords([], workspaceCoords(e))
      if ui.dragging.pan
        d = numeric['-'](mouse, ui.dragging.pan)
        
        ui.focus.view = ui.focus.view.mult(model.makeTransform([1,0,0,1,d[0],d[1]]))
      
      else if ui.dragging.componentPath
        # here's the constraint problem:
        # we need to adjust the transformation of first component of the component path ui.mouseOver
        # so that the current mouse position, when viewed in local coordinates, is STILL ui.dragging.startPosition
        
        components = ui.dragging.componentPath # [C0, C1, ...]
        c0 = components[0]
        
        constraintType = if ui.mouseOver.edge then (if key.shift then "scale" else "scaleRotate") else "translate"
        
        c0.transform = require("solveConstraint")(components, ui.dragging.startPosition, ui.dragging.originalCenter, mouse)[constraintType]()
      
      regenerateRenderers()
      render()
  
  $("#workspace").mousewheel (e, delta) ->
    scaleFactor = 1.1
    scale = Math.pow(scaleFactor, delta)
    scaleT = model.makeTransform([scale,0,0,scale,0,0])
    
    trans = ui.view.inverse().p(workspaceCoords(e))
    
    t1 = model.makeTransform([1,0,0,1,trans[0],trans[1]])
    t2 = model.makeTransform([1,0,0,1,-trans[0],-trans[1]])
    
    ui.focus.view = t1.mult(scaleT.mult(t2.mult(ui.focus.view)))
    
    regenerateRenderers()
    render()
  
  
  $(window).mousedown (e) ->
    e.preventDefault() # so you don't start selecting text
  
  $("#workspace").mousedown (e) ->
    if ui.mouseOver
      ui.dragging = {
        componentPath: ui.mouseOver.componentPath
        startPosition: localCoords(ui.mouseOver.componentPath, workspaceCoords(e))
        originalCenter: combineComponents(ui.mouseOver.componentPath).p([0, 0])
      }
    else
      ui.dragging = {
        pan: localCoords([], workspaceCoords(e))
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
  ui.size = windowSize = [$("#workspace").innerWidth(), $("#workspace").innerHeight()]
  canvas.attr({width: windowSize[0], height: windowSize[1]})
  
  minDimension = Math.min(windowSize[0], windowSize[1])
  ui.view = model.makeTransform([minDimension/2, 0, 0, minDimension/2, windowSize[0]/2, windowSize[1]/2])
  
  # TODO: need to regenerateRenderers if I change config...
  render()




regenerateRenderers = () ->
  definitions.forEach (definition) ->
    definition.renderer.regenerate()


render = () ->
  # clear the canvas
  ctx.setTransform(1,0,0,1,0,0)
  ctx.clearRect(0, 0, ui.size[0], ui.size[1])
  
  ui.view.set(ctx)
  ui.focus.renderer.draw(ctx, ui.mouseOver)
  
  makeDefinitionCanvases()



makeDefinitionCanvas = () ->
  def = $("<div class='definition'><canvas></canvas></div>")
  $("#definitions").append(def)
  c = $("canvas", def)
  c.attr({width: def.innerWidth(), height: def.innerHeight()})
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
    
    cx = c.getContext("2d")
    cx.setTransform(1,0,0,1,0,0)
    cx.clearRect(0,0,width,height)
    require("model").makeTransform([width/2, 0, 0, height/2, width/2, height/2]).set(cx)
    
    definition.renderer.draw(cx, ui.mouseOver)








workspaceView = () ->
  ui.view.mult(ui.focus.view)



combineComponents = (componentPath) ->
  combined = componentPath.reduce((transform, component) ->
    transform.mult(component.transform)
  , model.makeTransform())

localCoords = (componentPath, point) ->
  combined = workspaceView().mult(combineComponents(componentPath))
  combined.inverse().p(point)




module.exports = init