model = require("model")


circle = model.makePrimitiveDefinition (ctx) -> ctx.arc(0, 0, 1, 0, Math.PI*2)

window.movedCircle = movedCircle = model.makeCompoundDefinition()
movedCircle.add(circle, model.makeTransform([0.3, 0, 0, 0.3, 0, 0]))
movedCircle.add(movedCircle, model.makeTransform([0.6, 0, 0, 0.6, 0.5, 0]))
# movedCircle.add(movedCircle, model.makeTransform([0.7, 0, 0, 0.7, 0.5, 0.5]))



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
    ui.mouse = [e.clientX, e.clientY]
    
    if ui.dragging
      # here's the constraint problem:
      # we need to adjust the transformation of first component of the component path ui.mouseOver
      # so that the current ui.mouse, when viewed in local coordinates, is STILL ui.dragging.startPosition
      
      components = ui.mouseOver # [C0, C1, ...]
      
      mouse = ui.mouse
      target = ui.dragging.startPosition
      # OK. So right now we (would ideally) have: V * C0 * C1 * C2 * ... * target = mouse
      
      c0 = components[0]
      
      
      if !ui.mouseOverEdge
        objective = (args) ->
          newC0Transform = model.makeTransform(c0.transform.a[0..3].concat(args))
          newC0 = {transform: newC0Transform}
          newComponents = components.map (component) ->
            if component == c0 then newC0 else component
        
          result = ui.view.mult(combineComponents(newComponents)).p(target)
        
          error = numeric['-'](result, mouse)
          numeric.dot(error, error)
      
        uncmin = numeric.uncmin(objective, c0.transform.a[4..5])
        solution = uncmin.solution
      
        # let's put it in!
        c0.transform = model.makeTransform(c0.transform.a[0..3].concat(solution))
      
      
      
      else
        # Here we ALSO want to keep the center of the shape in the same place
        originalCenter = ui.dragging.originalCenter
      
        objective = (args) ->
          newC0Transform = model.makeTransform([args[0], args[1], -args[1], args[0], args[2], args[3]])
          newC0 = {transform: newC0Transform}
          newComponents = components.map (component) ->
            if component == c0 then newC0 else component
        
          result = ui.view.mult(combineComponents(newComponents)).p(target)
          error = numeric['-'](result, mouse)
          e1 = numeric.dot(error, error)
        
          result = combineComponents(newComponents).p([0, 0])
          error = numeric['-'](result, originalCenter)
          e2 = numeric.dot(error, error)
        
          e1 + e2*10000 # This weighting tends to improve performance. Found by just playing around.
      
        a = c0.transform.a
        uncmin = numeric.uncmin(objective, [a[0], a[1], a[4], a[5]])
      
        if !isNaN(uncmin.f)
          solution = uncmin.solution
      
          # let's put it in!
          a = solution
          c0.transform = model.makeTransform([a[0], a[1], -a[1], a[0], a[2], a[3]])
      
      
      # TODO: add a scaling only mode
      
      
      
      # # let's get rid of some pathological cases
      # if Math.abs(c0.transform.a[0] - c0.transform.a[1]) < 0.01
      #   console.log "want to fixed", c0.transform.a        
      #   # c0.transform = model.makeTransform([1, 0, 0, 1, c0.transform.a[4], c0.transform.a[5]])
      
      # if scale is too big, just scale it down
      # TODO
      
      
    
    
    render()
  
  $(window).mousedown (e) ->
    if ui.mouseOver
      ui.dragging = {
        componentPath: ui.mouseOver
        startPosition: localCoords(ui.mouseOver, ui.mouse)
        originalCenter: combineComponents(ui.mouseOver).p([0, 0])
      }
  
  $(window).mouseup (e) ->
    ui.dragging = false

setSize = () ->
  ui.size = windowSize = [$(window).width(), $(window).height()]
  canvas.attr({width: windowSize[0], height: windowSize[1]})
  
  minDimension = Math.min(windowSize[0], windowSize[1])
  ui.view = model.makeTransform([minDimension/2, 0, 0, minDimension/2, windowSize[0]/2, windowSize[1]/2])
  
  render()





config = {
  edgeSize: 0.7
  minScale: 0.001
  maxScale: 1000000
}









generateDraws = (definition, initialTransform) ->
  # generates an array of:
  #   {transform: Transform, draw: Draw, componentPath: [Component, ...]}
  #
  # possible limits:
  #   recursion depth
  #   recursions total
  #   draws total
  #   scale too small
  #   off screen
  queue = []
  draws = []
  process = (definition, transform, componentPath=[]) ->
    unless config.minScale < transform.scale() < config.maxScale then return # TODO: maybe move this to where the draw gets pushed...
    
    if definition.draw
      draws.push({
        transform: transform
        draw: definition.draw
        componentPath: componentPath
      })
    else
      # recurse
      definition.components.forEach (component) ->
        queue.push([component.definition, transform.mult(component.transform), componentPath.concat(component)])
  
  # top level
  queue.push([definition, initialTransform])
  
  i = 0
  while i < 1000
    break if !queue[i]
    process(queue[i]...)
    i++
  
  return draws


checkMouseOver = (draws, ctx, mousePosition) ->
  # if found, returns
  #   {componentPath: [Component, ...], edge: true|false}
  # else undefined
  ret = undefined
  draws.forEach (d) ->
    d.transform.set(ctx)
    ctx.beginPath()
    d.draw(ctx)
    if ctx.isPointInPath(mousePosition...)
      # see if it's on the edge
      ctx.scale(config.edgeSize, config.edgeSize)
      ctx.beginPath()
      d.draw(ctx)
      if ctx.isPointInPath(mousePosition...)
        # nope, mouse is in the center of the shape
        ret = {
          componentPath: d.componentPath
          edge: false
        }
      else
        # mouse is on the edge
        ret = {
          componentPath: d.componentPath
          edge: true
        }
  return ret
  

renderDraws = (draws, ctx) ->
  draws.forEach (d) ->
    d.transform.set(ctx)
    
    ctx.beginPath()
    d.draw(ctx)
    
    
    if d.componentPath[0] == ui.mouseOver?[0]
      if d.componentPath.every((component, i) -> component == ui.mouseOver[i])
        # if it IS the mouseOver element itself, draw it red
        if ui.mouseOverEdge
          ctx.fillStyle = "#f00"
          ctx.fill()
          ctx.scale(config.edgeSize, config.edgeSize)
          ctx.beginPath()
          d.draw(ctx)
          ctx.fillStyle = "#600"
          ctx.fill()
        else
          ctx.fillStyle = "#f00"
          ctx.fill()
      else
        # if its componentPath start is the same as mouseOver, draw it a little red
        ctx.fillStyle = "#600"
        ctx.fill()
    else
      ctx.fillStyle = "black"
      ctx.fill()




render = () ->
  draws = generateDraws(ui.focus, ui.view)
  if !ui.dragging
    check = checkMouseOver(draws, ctx, ui.mouse)
    if check
      ui.mouseOver = check.componentPath
      ui.mouseOverEdge = check.edge
    else
      ui.mouseOver = false
  
  # clear the canvas
  ctx.setTransform(1,0,0,1,0,0)
  ctx.clearRect(0, 0, ui.size[0], ui.size[1])
  
  renderDraws(draws, ctx)




combineComponents = (componentPath) ->
  combined = componentPath.reduce((transform, component) ->
    transform.mult(component.transform)
  , model.makeTransform())

localCoords = (componentPath, point) ->
  combined = ui.view.mult(combineComponents(componentPath))
  combined.inverse().p(point)


init()
render()