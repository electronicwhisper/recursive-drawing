# generates an array of:
#   {transform: Transform, draw: Draw, componentPath: [Component, ...]}

module.exports = (definition, initialTransform) ->
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
    # unless require("config").minScale < transform.scale() < require("config").maxScale then return # TODO: maybe move this to where the draw gets pushed...
    
    if definition.draw
      unless require("config").minScale < transform.scale() < require("config").maxScale then return
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