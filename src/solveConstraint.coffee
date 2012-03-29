dist = (p1, p2) ->
  d = numeric['-'](p1, p2)
  numeric.dot(d, d)


# Takes in a componentList [C0, C1, ...]
# originalMouse position, in LOCAL coordinates (i.e. after C0, C1, ...)
# originalCenter position, in LOCAL coordinates
# mouse position, in GLOBAL coordinates (i.e. before C0, C1, ...)
# We return a new transform (for C0) such that the constraints are solved
module.exports = (components, originalMouse, originalCenter, mouse) ->
  c0 = components[0]
  
  
  solve = (objective, argsToMatrix, startArgs) ->
    argsToNewC0Transform = (args) ->
      require("model").makeTransform(argsToMatrix(args)).mult(c0.transform)
    obj = (args) ->
      newC0Transform = argsToNewC0Transform(args)
      newC0 = {transform: newC0Transform}
      newComponents = components.map (component) ->
        if component == c0 then newC0 else component
      
      totalTransform = require("model").combineComponents(newComponents)
      
      return objective(totalTransform)
    
    uncmin = numeric.uncmin(obj, startArgs)
    solution = uncmin.solution
    
    return argsToNewC0Transform(solution)
  
  
  return {
    translate: () ->
      objective = (transform) ->
        result = transform.p(originalMouse)
        dist(result, mouse)
      solve(objective, (([x, y]) -> [1, 0, 0, 1, x, y]), [0, 0])
    
    scaleRotate: () ->
      objective = (transform) ->
        result = transform.p(originalMouse)
        e1 = dist(result, mouse)
        
        result = transform.p([0, 0])
        e2 = dist(result, originalCenter)
        
        e1 + e2*10000 # This weighting tends to improve performance. Found by just playing around.
      solve(objective, (([s, r, x, y]) -> [s, r, -r, s, x, y]), [1, 0, 0, 0])
  }