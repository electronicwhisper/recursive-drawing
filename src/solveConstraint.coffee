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
    
    
    if isNaN(uncmin.f)
      console.log "nan"
      return c0.transform # unable to solve, just return the original c0.transform
    else
      error = obj(uncmin.solution)
      if error > .000001
        console.log "error too big", error
        return c0.transform # error way too big
      
      window.debugSolver = {
        uncmin: uncmin
        error: obj(uncmin.solution)
      }
      
      solution = uncmin.solution
      t = argsToNewC0Transform(solution)
      if t.scaleRange()[0] < .0001
        console.log "too small", t.a
        return c0.transform
      return t
  
  
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
        
        e1 + e2
      solve(objective, (([s, r, x, y]) -> [s, r, -r, s, x, y]), [1, 0, 0, 0])
    
    scale: () ->
      objective = (transform) ->
        result = transform.p(originalMouse)
        e1 = dist(result, mouse)
        
        result = transform.p([0, 0])
        e2 = dist(result, originalCenter)
        
        e1 + e2
      solve(objective, (([sx, sy, x, y]) -> [sx, 0, 0, sy, x, y]), [1, 1, 0, 0])
      # 
      # 
      # x0s = [[1, 1, 0, 0], [1, -1, 0, 0], [-1, 1, 0, 0], [-1, -1, 0, 0]]
      # 
      # solution = null
      # for x0 in x0s
      #   solution = solve(objective, (([sx, sy, x, y]) -> [sx, 0, 0, sy, x, y]), x0)
      #   if solution != c0.transform then break
      # return solution
  }