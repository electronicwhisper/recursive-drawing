model = require("model")


circle = model.makePrimitiveDefinition (ctx) -> ctx.arc(0, 0, 1*require("config").normalizeConstant, 0, Math.PI*2)
square = model.makePrimitiveDefinition (ctx) -> ctx.rect(-1*require("config").normalizeConstant, -1*require("config").normalizeConstant, 2*require("config").normalizeConstant, 2*require("config").normalizeConstant)

window.movedCircle = movedCircle = model.makeCompoundDefinition()


definitions = ko.observableArray([circle, square, movedCircle])


ui = {
  view: model.makeTransform([1,0,0,1,400,300]) # top level transform so as to make 0,0 the center and 1,0 or 0,1 be the edge (of the browser viewport)
  # mouseOver: false # an object {componentPath: [c0, c1, ...], edge: Boolean}
  dragging: false # an object, either {definition}, {pan}, or {componentPath, startPosition, originalCenter}
}




koState = window.koState = {
  test: movedCircle
  definitions: definitions
  focus: ko.observable(movedCircle) # current definition we're looking at
  mouseOver: ko.observable(false)
}


sizeCanvas = (canvas) ->
  # sets the width and height of a canvas element based on its containing div
  canvas = $(canvas)
  parentDiv = canvas.parent()
  width = parentDiv.innerWidth()
  height = parentDiv.innerHeight()
  if +canvas.attr("width") != width || +canvas.attr("height") != height
    canvas.attr({width: width, height: height})
canvasTopLevelTransform = (canvas) ->
  # given a canvas, determines the top-level transform based on its width and height
  width = canvas.width
  height = canvas.height
  
  minDimension = Math.min(width, height)
  
  require("model").makeTransform([minDimension/2/require("config").normalizeConstant, 0, 0, minDimension/2/require("config").normalizeConstant, width/2, height/2])



ko.bindingHandlers.canvas = {
  init: (element, valueAccessor, allBindingsAccessor, viewModel) ->
    # sizeCanvas(element)
    setSize() # TODO: can replace this if I make aspect ratio an observable, then size .mini's based on that in ko
  update: (element, valueAccessor, allBindingsAccessor, viewModel) ->
    $(element).data("definition", valueAccessor())
    render() # TODO: way too many renders! Think this through..
}
ko.bindingHandlers.componentPath = {
  update: (element, valueAccessor, allBindingsAccessor, viewModel) ->
    $(element).data("componentPath", valueAccessor())
    render()
}


_.reverse = (a) ->
  ret = []
  for x in a
    ret.unshift(x)
  return ret





workspaceCoords = (e) ->
  # compensate for DOM positioning
  # takes an event's clientX and clientY and returns a point [x,y] where the mouse is relative to the workspace canvas
  canvasPos = $("#workspaceCanvas").offset()
  [e.clientX - canvasPos.left, e.clientY - canvasPos.top]


init = () ->
  canvas = $("#workspaceCanvas")
  
  ctx = canvas[0].getContext('2d')
  
  regenerateRenderers()
  
  
  setSize()
  
  
  
  # Set up events
  
  $(window).resize(setSize)
  
  $("#workspace").mouseenter (e) ->
    if ui.dragging?.definition
      # create a new component in the focused definition
      mouse = localCoords([], workspaceCoords(e))
      
      # need to compensate for the view pan of the definition being dragged in
      pan = ui.dragging.definition.view.inverse().p([0,0])
      
      c = koState.focus().add(ui.dragging.definition, model.makeTransform([1, 0, 0, 1, mouse[0]-pan[0], mouse[1]-pan[1]]))
      
      # t = model.makeTransform([1, 0, 0, 1, mouse[0], mouse[1]]).mult(ui.dragging.definition.view.inverse())
      # c = ui.focus.add(ui.dragging.definition, t)
      
      # start dragging it
      componentPath = [c]
      koState.mouseOver({
        componentPath: componentPath
        edge: false
      })
      ui.dragging = {
        componentPath: componentPath
        startPosition: localCoords(componentPath, workspaceCoords(e))
        originalCenter: combineComponents(componentPath).p([0, 0])
      }
      
      regenerateRenderers()
      render()
  
  $("#workspace").mousemove (e) ->
    if !ui.dragging
      # check if we're hovering over a shape
      ui.view.set(ctx)
      koState.mouseOver(koState.focus().renderer.pointPath(ctx, workspaceCoords(e)))
      
      render()
  
  $("#workspace").mouseleave (e) ->
    if !ui.dragging && $("#context-menu-layer").length == 0
      # not dragging and no context menu
      koState.mouseOver(false)
      render()
  
  $(window).mousemove (e) ->
    if ui.dragging
      mouse = localCoords([], workspaceCoords(e))
      if ui.dragging.pan
        d = numeric['-'](mouse, ui.dragging.pan)
        
        koState.focus().view = koState.focus().view.mult(model.makeTransform([1,0,0,1,d[0],d[1]]))
      
      else if ui.dragging.componentPath
        # here's the constraint problem:
        # we need to adjust the transformation of first component of the component path
        # so that the current mouse position, when viewed in local coordinates, is STILL ui.dragging.startPosition
        
        components = ui.dragging.componentPath # [C0, C1, ...]
        c0 = components[0]
        
        # TODO: move edge into dragging, shouldn't be checking mouseOver here
        constraintType = if koState.mouseOver().edge then (if key.shift then "scale" else "scaleRotate") else "translate"
        
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
    
    koState.focus().view = t1.mult(scaleT.mult(t2.mult(koState.focus().view)))
    
    regenerateRenderers()
    render()
  
  
  $(window).mousedown (e) ->
    e.preventDefault() # so you don't start selecting text
  
  $("#workspace").mousedown (e) ->
    if koState.mouseOver()
      if key.command
        # copy it
        oldComponent = koState.mouseOver().componentPath[0]
        newComponent = koState.focus().add(oldComponent.definition, oldComponent.transform)
        
        mo = koState.mouseOver()
        mo.componentPath = mo.componentPath.map (c) -> if c == oldComponent then newComponent else c
        koState.mouseOver(mo)
      
      ui.dragging = {
        componentPath: koState.mouseOver().componentPath
        startPosition: localCoords(koState.mouseOver().componentPath, workspaceCoords(e))
        originalCenter: combineComponents(koState.mouseOver().componentPath).p([0, 0])
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
    if definition.draw
      # you can't edit the primitive shapes, so just add it to the current canvas
      
    else
      koState.focus(definition)
      render()
  
  $("#addDefinition").on "click", (e) ->
    newDef = model.makeCompoundDefinition()
    newDef.view = koState.focus().view
    definitions.push(newDef)
    koState.focus(newDef)
    setSize()
    # render()
  
  $.contextMenu({
    selector: "#workspace"
    build: ($trigger, e) ->
      if koState.mouseOver()
        return {items: {
          del: {name: "Delete Shape", callback: () ->
            c = koState.mouseOver().componentPath[0]
            i = koState.focus().components.indexOf(c)
            koState.focus().components.splice(i, 1)
            regenerateRenderers()
            render()
          }
        }}
      else
        return false
  })
  
  # TODO: make it so when context menu goes away, trigger a mousemove event to get a different koState.mouseOver() potentially
  # $(window).on "contextmenu:hide", (e) ->
  #   console.log e
  
  
  
  $(window).mouseup (e) ->
    ui.dragging = false
  
  
  
  
  
  ko.applyBindings(koState)
  render()
  
  
  
  # setInterval(drawFurther, 1000/60)
  
  
  
  
  

setSize = () ->
  aspectRatio = $("#workspace").innerWidth() / $("#workspace").innerHeight()
  
  $(".mini").each () ->
    $(this).height($(this).width() / aspectRatio)
  
  
  
  $("canvas").each () ->
    sizeCanvas(this)
  
  ui.view = canvasTopLevelTransform($("#workspaceCanvas")[0])
  
  # TODO: need to regenerateRenderers if I change config...
  render()




regenerateRenderers = () ->
  definitions().forEach (definition) ->
    definition.renderer.regenerate()




arrayEquals = (a1, a2) ->
  a1.length == a2.length && a1.every (x, i) -> a2[i] == x

startsWith = (needle, haystack) ->
  needle.every (x, i) -> haystack[i] == x




lastRenderTime = Date.now()

render = () ->
  $("canvas").each () ->
    canvas = this
    definition = $(canvas).data("definition")
    componentPath = $(canvas).data("componentPath")
    
    
    
    if definition
      ctx = canvas.getContext("2d")
      
      
      
      # clear it
      ctx.setTransform(1,0,0,1,0,0)
      ctx.clearRect(0,0,canvas.width,canvas.height)
      
      canvasTopLevelTransform(canvas).set(ctx)
      
      extraCp = []
      
      if componentPath
        # transform in
        t = combineComponents(componentPath)
        t = definition.view.mult(t.mult(_.last(componentPath).definition.view.inverse()))
        t.app(ctx)
        
        # adjust definition
        definition = _.last(componentPath).definition
        
        # so that mouseOver stuff will still be right
        extraCp = componentPath
      
      mouseOver = koState.mouseOver()
      if mouseOver
        cp = mouseOver.componentPath
        
        # any component path that *has* c0 will be modified.
        c0 = cp[0]
        
        # any component path starting with cpUniform and having no further c0's will be uniformly transformed with the manipulation.
        lastC0Index = cp.lastIndexOf(c0)
        cpUniform = cp.slice(0, lastC0Index+1)
      
      
      definition.renderer.draw ctx, (ctx, draw, componentPath) ->
        componentPath = extraCp.concat(componentPath)
        if mouseOver && c0 == componentPath[0]
          if startsWith(cpUniform, componentPath) && componentPath.lastIndexOf(c0) == lastC0Index
            ctx.fillStyle = "#900"
            ctx.fill()
            
            if mouseOver.edge
              ctx.scale(require("config").edgeSize, require("config").edgeSize)
              ctx.beginPath()
              draw(ctx)
              ctx.fillStyle = "#600"
              ctx.fill()
          else
            ctx.fillStyle = "#600"
            ctx.fill()
        else
          ctx.fillStyle = "black"
          ctx.fill()
  
  # if Date.now() - lastRenderTime > require("config").fillInTime
  #   # we've started filling in, so need to regenerate the focused renderer
  #   koState.focus().renderer.regenerate()
  # lastRenderTime = Date.now()


drawFurther = window.drawFurther = () ->
  if Date.now() - lastRenderTime > require("config").fillInTime
    ctx = $("#workspaceCanvas")[0].getContext('2d')
    ui.view.set(ctx)
    koState.focus().renderer.drawFurther(ctx)













workspaceView = () ->
  ui.view.mult(koState.focus().view)



combineComponents = (componentPath) ->
  combined = componentPath.reduce((transform, component) ->
    transform.mult(component.transform)
  , model.makeTransform())

localCoords = (componentPath, point) ->
  combined = workspaceView().mult(combineComponents(componentPath))
  combined.inverse().p(point)




module.exports = init