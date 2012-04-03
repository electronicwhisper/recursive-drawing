# generates an array of:
#   {transform: Transform, draw: Draw, componentPath: [Component, ...]}


distance = (transform) ->
  center = transform.p([0,0])
  numeric.dot(center, center)



module.exports = (definition, initialTransform) ->
  
  draws = []
  expansions = 0
  expansionLimit = require("config").expansionLimit
  leaves = []
  
  class Tree
    constructor: (@transform, @definition, @parent, @component) ->
      # @component is the component of @parent's @definition, which was used to create this Tree.
      # Thus if a tree has no @parent, it has no @component
      
    drewSomething: () ->
      if !@active
        @active = true
        @parent.drewSomething() if @parent
    
    findAncestorWithComponent: (c) ->
      if @component == c
        return this
      else if @parent
        return @parent.findAncestorWithComponent(c)
      else
        return false
    
    expand: () ->
      if @definition.draw
        scaleRange = @transform.scaleRange()
        if scaleRange[0] > require("config").minScale && scaleRange[1] < require("config").maxScale
          # if distance(@transform) < require("config").maxScale*3 + scaleRange[1] # TODO this can be better, way better
          draws.push({
            transform: @transform
            draw: @definition.draw
            componentPath: @componentPath()
          })
          @drewSomething()
      else
        
        # make sure it's worth expanding
        ancestor = @parent?.findAncestorWithComponent(@component)
        if ancestor
          # we're recursing
          if !ancestor.active
            # hmm.. my ancestor didn't draw anything. I will wait to expand.
            leaves.push(this)
            return
        
        # keep track of global number of expansions
        expansions++
        if expansions > expansionLimit then return # limit
        
        @children = []
        for component in @definition.components
          t = new Tree(@transform.mult(component.transform), component.definition, this, component)
          @children.push(t)
          leaves.push(t)
    
    componentPath: () ->
      return @_memoComponentPath if @_memoComponentPath
      return @_memoComponentPath = [] if !@parent
      return @_memoComponentPath = @parent.componentPath().concat(@component)
    
  
  
  tree = new Tree(initialTransform, definition)
  leaves = [tree]
  
  lastExpansions = expansions
  loop
    oldLeaves = leaves
    leaves = []
    for t in oldLeaves
      t.expand()
    # tree.expand()
    
    # if expansions > expansionLimit then break
    if lastExpansions == expansions
      break
    lastExpansions = expansions
    
    if expansions > expansionLimit
      break
  
  
  return draws




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
#   while i < 300
#     break if !queue[i]
#     process(queue[i]...)
#     i++
#   
#   return draws



# module.exports = (definition, initialTransform) ->
#   if definition.draw
#     return [{transform: initialTransform, draw: definition.draw, componentPath: []}]
#   else
#     
#     queue = []
#     draws = []
#     
#     process = (definition, transform, componentPath=[]) ->
#       toAdd = []
#       somethingNew = false
#       definition.components.forEach (component) ->
#         d = component.definition
#         t = transform.mult(component.transform)
#         c = componentPath.concat(component)
#         
#         if d.draw
#           scaleRange = t.scaleRange()
#           if scaleRange[0] < require("config").minScale || scaleRange[1] > require("config").maxScale
#             return
#             
#           draws.push({
#             transform: t
#             draw: d.draw
#             componentPath: c
#           })
#           somethingNew = true
#         else
#           if componentPath.indexOf(component) == -1
#             somethingNew = true
#           toAdd.push([d, t, c])
#       if somethingNew
#         queue = queue.concat(toAdd)
#       
#     queue.push([definition, initialTransform])
#     
#     i = 0
#     while i < 300
#       break if !queue[i]
#       process(queue[i]...)
#       i++
#     
#     return draws