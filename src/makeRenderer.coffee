arrayEquals = (a1, a2) ->
  a1.length == a2.length && a1.every (x, i) -> a2[i] == x


makeRenderer = (definition) ->
  
  # Internally we're keeping a tree structure that corresponds to the recursion tree of the definition.
  
  draws = [] # this will be a list of Tree nodes whose definition has a .draw method
  
  # For performance optimization, we keep a list of leaves of the tree
  # When expand is called on root, it expects leaves to be empty (i.e. [])
  #   It then adds to leaves as it walks down the tree, sometimes expanding former leaves.
  
  expansions = null
  expansionLimit = null
  leaves = null
  tree = null
  
  class Tree
    constructor: (@transform, @definition, @parent, @component) ->
      # @component is the component of @parent's @definition, which was used to create this Tree.
      # Thus if a tree has no @parent, it has no @component
      if @parent && @parent.c0
        @c0 = @parent.c0
      else
        @c0 = @component
      
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
        if scaleRange[0] > require("config").minSize && scaleRange[1] < require("config").maxSize
          # if distance(@transform) < require("config").maxScale*3 + scaleRange[1] # TODO this can be better, way better
          draws.push(this)
          @drewSomething()
      else
        
        # make sure it's worth expanding
        ancestor = @parent?.findAncestorWithComponent(@component)
        if ancestor
          # we're recursing
          if !ancestor.active
            # My ancestor didn't draw anything (yet), so I will postpone expanding.
            leaves.push(this)
            return
        
        # keep track of global number of expansions
        expansions++
        if expansions > expansionLimit
          # Too many expansions. Abort.
          leaves.push(this)
          return
        
        @children = []
        for component in @definition.components
          t = new Tree(@transform.mult(component.transform), component.definition, this, component)
          @children.push(t)
          leaves.push(t)
    
    componentPath: () ->
      return @_memoComponentPath if @_memoComponentPath
      return @_memoComponentPath = [] if !@parent
      return @_memoComponentPath = @parent.componentPath().concat(@component)
  
  
  return {
    regenerate: () ->
      draws = []
      
      expansions = 0
      expansionLimit = require("config").expansionLimit
      
      tree = new Tree(definition.view, definition)
      leaves = [tree]
      
      lastExpansions = expansions
      loop
        oldLeaves = leaves
        leaves = []
        for t in oldLeaves
          t.expand()
          
        if lastExpansions == expansions
          # Nothing happened. Must be done with all possible expansions.
          break
        lastExpansions = expansions
        
        if expansions > expansionLimit
          break
      
    draw: (ctx, mouseOver) ->
      for d in draws
        ctx.save()
        d.transform.app(ctx)
        
        ctx.beginPath()
        d.definition.draw(ctx)
        
        if mouseOver && mouseOver.componentPath[0] == d.c0
          if arrayEquals(mouseOver.componentPath, d.componentPath())
            ctx.fillStyle = "#900"
            ctx.fill()
            
            if mouseOver.edge
              ctx.scale(require("config").edgeSize, require("config").edgeSize)
              ctx.beginPath()
              d.definition.draw(ctx)
              ctx.fillStyle = "#300"
              ctx.fill()
          else
            ctx.fillStyle = "#300"
            ctx.fill()
        else
          ctx.fillStyle = "black"
          ctx.fill()
        
        ctx.restore()
      
    pointPath: (ctx, point) ->
      # returns a mouseOver object consisting of: componentPath, edge (boolean), tree (for internal use)
      # or else undefined
      ret = undefined
      for d in draws
        ctx.save()
        d.transform.app(ctx)
        
        ctx.beginPath()
        d.definition.draw(ctx)
        if ctx.isPointInPath(point...)
          # see if it's on the edge
          ctx.scale(require("config").edgeSize, require("config").edgeSize)
          ctx.beginPath()
          d.definition.draw(ctx)
          if ctx.isPointInPath(point...)
            # nope, mouse is in the center of the shape
            ret = {
              componentPath: d.componentPath()
              edge: false
              # tree: d
            }
          else
            # mouse is on the edge
            ret = {
              componentPath: d.componentPath()
              edge: true
              # tree: d
            }
        
        ctx.restore()
      return ret
      
    drawFurther: (ctx) ->
      # TODO
  }




module.exports = makeRenderer