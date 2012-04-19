arrayEquals = (a1, a2) ->
  a1.length == a2.length && a1.every (x, i) -> a2[i] == x

startsWith = (needle, haystack) ->
  needle.every (x, i) -> haystack[i] == x




makeRenderer = (definition) ->
  
  # Internally we're keeping a tree structure that corresponds to the recursion tree of the definition.
  
  draws = [] # this will be a list of Tree nodes whose definition has a .draw method
  
  # For performance optimization, we keep a list of leaves of the tree
  # When expand is called on root, it expects leaves to be empty (i.e. [])
  #   It then adds to leaves as it walks down the tree, sometimes expanding former leaves.
  
  expansions = null
  expansionLimit = null
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
      if expansions >= expansionLimit
        # Too many expansions. Abort.
        leaves.push(this)
        return
      
      if @definition.draw
        scaleRange = @transform.scaleRange()
        if scaleRange[0] > require("config").minSize && scaleRange[1] < require("config").maxSize
          # if distance(@transform) < require("config").maxSize*3 + scaleRange[1] # TODO this can be better, way better
          draws.push(this)
          expansions++
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
        
        # @children = []
        for component in @definition.components()
          t = new Tree(@transform.mult(component.transform), component.definition, this, component)
          # @children.push(t)
          leaves.push(t)
    
    componentPath: () ->
      return @_memoComponentPath if @_memoComponentPath
      return @_memoComponentPath = [] if !@parent
      return @_memoComponentPath = @parent.componentPath().concat(@component)
  
  
  expandLoop = () ->
    # calls expand on leaves repeatedly until they stop expanding (because done with all possible expansions, or hit expansionLimit)
    loop
      if leaves.length > require("config").leafLimit then break
      oldLeaves = leaves
      leaves = []
      lastExpansions = expansions
      for t, i in oldLeaves
        if expansions >= expansionLimit
          # prepend any oldLeaves that we didn't get to
          leaves = oldLeaves.slice(i).concat(leaves)
          break
        t.expand()
      if expansions >= expansionLimit
        break
      if lastExpansions == expansions
        break # Nothing expanded. Must be done with all possible expansions.
  
  
  return {
    regenerate: () ->
      draws = []
      
      expansions = 0
      expansionLimit = require("config").expansionLimit
      
      tree = new Tree(definition.view, definition)
      leaves = [tree]
      
      expandLoop()
      
    draw: (ctx, mouseOver) ->
      if mouseOver
        cp = mouseOver.componentPath
        
        # any component path that *has* c0 will be modified.
        c0 = cp[0]
        
        # any component path starting with cpUniform and having no further c0's will be uniformly transformed with the manipulation.
        lastC0Index = cp.lastIndexOf(c0)
        cpUniform = cp.slice(0, lastC0Index+1)
      
      
      for d in draws
        ctx.save()
        d.transform.app(ctx)
        
        ctx.beginPath()
        d.definition.draw(ctx)
        
        if mouseOver && mouseOver.componentPath[0] == d.componentPath()[0]
          # if arrayEquals(mouseOver.componentPath, d.componentPath())
          if startsWith(cpUniform, d.componentPath()) && d.componentPath().lastIndexOf(c0) == lastC0Index
            ctx.fillStyle = "#900"
            ctx.fill()
            
            if mouseOver.edge
              ctx.scale(require("config").edgeSize, require("config").edgeSize)
              ctx.beginPath()
              d.definition.draw(ctx)
              ctx.fillStyle = "#600"
              ctx.fill()
          else
            ctx.fillStyle = "#600"
            ctx.fill()
        else
          ctx.fillStyle = "black"
          ctx.fill()
        
        ctx.restore()
    
    drawFurther: (ctx) ->
      # console.log "expansions, expansionLimit", expansions, expansionLimit
      if expansions == expansionLimit
        originalDrawsLength = draws.length
        
        # console.log "original draws length", originalDrawsLength
        
        expansions = 0
        expandLoop()
        
        newDraws = draws.splice(originalDrawsLength)
        
        # console.log "new draws length", newDraws.length
        
        for d in newDraws
          ctx.save()
          d.transform.app(ctx)
          ctx.beginPath()
          d.definition.draw(ctx)
          ctx.fillStyle = "black"
          ctx.fill()
          ctx.restore()
    
    pointPath: (ctx, point) ->
      # returns a mouseOver object consisting of: componentPath, edge (boolean)
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
            }
          else
            # mouse is on the edge
            ret = {
              componentPath: d.componentPath()
              edge: true
            }
        
        ctx.restore()
      return ret
  }




module.exports = makeRenderer