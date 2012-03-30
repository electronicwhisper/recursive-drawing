# generates an array of:
#   {transform: Transform, draw: Draw, componentPath: [Component, ...]}

# module.exports = (definition, initialTransform) ->
#   #
#   # possible limits:
#   #   recursion depth
#   #   recursions total
#   #   draws total
#   #   scale too small
#   #   off screen
#   queue = []
#   draws = []
#   process = (definition, transform, componentPath=[]) ->
#     if definition.draw
#       
#       scaleRange = transform.scaleRange()
#       if scaleRange[0] < require("config").minScale || scaleRange[1] > require("config").maxScale
#         return
#       
#       draws.push({
#         transform: transform
#         draw: definition.draw
#         componentPath: componentPath
#       })
#     else
#       # recurse
#       definition.components.forEach (component) ->
#         queue.push([component.definition, transform.mult(component.transform), componentPath.concat(component)])
#   
#   # top level
#   queue.push([definition, initialTransform])
#   
#   i = 0
#   while i < 1000
#     break if !queue[i]
#     process(queue[i]...)
#     i++
#   
#   return draws



module.exports = (definition, initialTransform) ->
  if definition.draw
    return [{transform: initialTransform, draw: definition.draw, componentPath: []}]
  else
    
    queue = []
    draws = []
    
    process = (definition, transform, componentPath=[]) ->
      toAdd = []
      somethingNew = false
      definition.components.forEach (component) ->
        d = component.definition
        t = transform.mult(component.transform)
        c = componentPath.concat(component)
        
        if d.draw
          scaleRange = t.scaleRange()
          if scaleRange[0] < require("config").minScale || scaleRange[1] > require("config").maxScale
            return
            
          draws.push({
            transform: t
            draw: d.draw
            componentPath: c
          })
          somethingNew = true
        else
          if componentPath.indexOf(component) == -1
            somethingNew = true
          toAdd.push([d, t, c])
      if somethingNew
        queue = queue.concat(toAdd)
      
    queue.push([definition, initialTransform])
    
    i = 0
    while i < 1000
      break if !queue[i]
      process(queue[i]...)
      i++
    
    return draws