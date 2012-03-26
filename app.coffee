makeTransform = (matrix=[1,0,0,1,0,0]) ->
  o = {}
  o.a = matrix
  o.p = (point) ->
    # apply the transform to a point
    m = matrix
    p = point
    [
      m[0]*p[0] + m[2]*p[1] + m[4],
      m[1]*p[0] + m[3]*p[1] + m[5]
    ]
  o.mult = (transform) ->
    x = matrix
    y = transform.a
    makeTransform [
      x[0]*y[0]+x[2]*y[1],
      x[1]*y[0]+x[3]*y[1],
      x[0]*y[2]+x[2]*y[3],
      x[1]*y[2]+x[3]*y[3],
      x[0]*y[4]+x[2]*y[5]+x[4],
      x[1]*y[4]+x[3]*y[5]+x[5]
    ]
  memoInverse = false
  o.inverse = () ->
    return memoInverse if memoInverse
    [a,b,c,d,e,f] = matrix
    x = a * d - b * c;
    memoInverse = makeTransform [
      d / x,
      -b / x,
      -c / x,
      a / x,
      (c * f - d * e) / x,
      (b * e - a * f) / x
    ]
  o.set = (ctx) ->
    ctx.setTransform(matrix...)
  return o



makeComponent = (definition, transform) ->
  o = {
    id: _.uniqueId("component")
    definition: definition
    transform: transform
  }




makeDefinition = () ->
  o = {
    view: makeTransform()
  }


# a definition either has a draw function or is a list of transform/definition pairs

makePrimitiveDefinition = (draw) ->
  o = makeDefinition()
  # draw function takes a ctx and makes a path
  o.draw = draw
  return o

makeCompoundDefinition = () ->
  o = makeDefinition()
  o.components = []
  o.add = (definition, transform) ->
    o.components.push({
      transform: transform
      definition: definition
    })
  return o



circle = makePrimitiveDefinition (ctx) -> ctx.arc(0, 0, 1, 0, Math.PI*2)

movedCircle = makeCompoundDefinition()
movedCircle.add(circle, makeTransform([0.3, 0, 0, 0.3, 0, 0]))
movedCircle.add(movedCircle, makeTransform([0.7, 0, 0, 0.7, 0.5, 0]))



ui = {
  focus: movedCircle # current definition we're looking at
  view: makeTransform([1,0,0,1,400,300]) # top level transform so as to make 0,0 the center and 1,0 or 0,1 be the edge
  size: [100, 100]
  mouse: [100, 100]
  mouseOver: [] # a component path
}

canvas = null
ctx = null
init = () ->
  canvas = $("#main")
  ctx = canvas[0].getContext('2d')
  
  setSize()
  $(window).resize () ->
    setSize()
    render()
  
  
  $(window).mousemove (e) ->
    ui.mouse = [e.clientX, e.clientY]
    
    # localCoords = ui.view.inverse().p(mouse)
    # movedCircle.components[1].transform = makeTransform([0.7, 0, 0, 0.7, localCoords[0], localCoords[1]])
    
    render()
  

setSize = () ->
  ui.size = windowSize = [$(window).width(), $(window).height()]
  canvas.attr({width: windowSize[0], height: windowSize[1]})
  
  minDimension = Math.min(windowSize[0], windowSize[1])
  ui.view = makeTransform([minDimension/2, 0, 0, minDimension/2, windowSize[0]/2, windowSize[1]/2])




render = () ->
  # clear the canvas
  ctx.setTransform(1,0,0,1,0,0)
  ctx.clearRect(0, 0, ui.size[0], ui.size[1])
  ctx.fillStyle = "black"
  
  # we'll also be seeing if the mouse is in any of the drawn objects
  ui.mouseOver = []
  
  # strategy for breadth-first rendering
  queue = []
  process = (definition, transform, componentPath=[]) ->
    if definition.draw
      transform.set(ctx)
      
      ctx.beginPath()
      definition.draw(ctx)
      ctx.fill()
      
      if ctx.isPointInPath(ui.mouse...)
        ui.mouseOver = componentPath
      
    else
      # recurse
      definition.components.forEach (component) ->
        queue.push([component.definition, transform.mult(component.transform), componentPath.concat(component)])
  
  # top level
  queue.push([ui.focus, ui.view])
  
  i = 0
  while i < 100
    break if !queue[i]
    process(queue[i]...)
    i++
  
  if ui.mouseOver.length > 0
    # draw the shape, red
    ctx.fillStyle = "red"
    combined = combineTransforms(ui.mouseOver)
    combined.set(ctx)
    ctx.beginPath()
    _.last(ui.mouseOver).definition.draw(ctx)
    ctx.fill()


combineTransforms = (componentPath) ->
  combined = componentPath.reduce((transform, component) ->
    transform.mult(component.transform)
  , ui.view)

localCoords = (componentPath, point) ->
  # combined = combineTransforms(componentPath)
  combined = componentPath.reduce((transform, component) ->
    transform.mult(component.transform)
  , ui.view)
  console.log combined
  combined.inverse().p(point)


init()
render()