arrayEquals = (a1, a2) ->
  a1.length == a2.length && a1.every (x, i) -> a2[i] == x

startsWith = (needle, haystack) ->
  needle.every (x, i) -> haystack[i] == x


statuses = {
  tooSmall: {}
  tooBig: {}
  drawn: {}
}



makeRenderer = (definition) ->
  
  # Internally we're keeping a tree structure that corresponds to the recursion tree of the definition.
  
  draws = [] # this will be a list of Tree nodes whose definition has a .draw method
  
  # For performance optimization, we keep a list of leaves of the tree
  # When expand is called on root, it expects leaves to be empty (i.e. [])
  #   It then adds to leaves as it walks down the tree, sometimes expanding former leaves.
  
  expansions = null
  expansionLimit = require("config").expansionLimit
  leaves = []
  
  class Tree
    constructor: (@transform, @definition, @parent, @component) ->
      # @component is the component of @parent's @definition, which was used to create this Tree.
      # Thus if a tree has no @parent, it has no @component
    
    setStatus: (status) ->
      if @status != statuses.drawn
        @status = status
        if @parent
          @parent.setStatus(status)
    
    findAncestorWithComponent: (c, n=0) ->
      if n > 50
        # not going to find it (unless the user made a containment chain of 50 different shapes), so give up
        # this is an optimization and also prevents call stack from overloading in Chrome
        # (To observe overloading, make a recursion where the base is a compound shape, wait a bit, do a mouseover
        # though still not sure why the mouseover triggers the error.)
        return false
      else if @component == c
        return this
      else if @parent
        return @parent.findAncestorWithComponent(c, n+1)
      else
        return false
    
    expand: () ->
      if expansions >= expansionLimit
        # Too many expansions. Abort.
        leaves.push(this)
        return
      
      # keep track of global number of expansions
      expansions++
      
      if @definition.draw
        scaleRange = @transform.scaleRange()
        if scaleRange[0] < require("config").minSize
          @setStatus(statuses.tooSmall)
        else if scaleRange[1] > require("config").maxSize
          @setStatus(statuses.tooBig)
        else
          # if distance(@transform) < require("config").maxSize*3 + scaleRange[1] # TODO this can be better, way better
          draws.push(this)
          @setStatus(statuses.drawn)
      else
        
        # make sure it's worth expanding
        ancestor = @parent?.findAncestorWithComponent(@component)
        if ancestor
          # we're recursing, check to make sure we shouldn't postpone.
          postpone = false
          if ancestor.status == statuses.tooSmall
            # unless I'm getting bigger, I should postpone
            postpone = true unless @transform.scaleRange()[0] > ancestor.transform.scaleRange()[0]
          else if ancestor.status == statuses.tooBig
            # unless I'm getting smaller, I should postpone
            postpone = true unless @transform.scaleRange()[1] < ancestor.transform.scaleRange()[1]
          else if !ancestor.status?
            # ancestor hasn't encountered any drawn shapes yet. Postpone.
            postpone = true
          
          if postpone
            leaves.push(this)
            return
        
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
      # expansionLimit = require("config").expansionLimit
      
      tree = new Tree(definition.view, definition)
      leaves = [tree]
      
      expandLoop()
      
    draw: (ctx, drawCallback) ->
      for d in draws
        ctx.save()
        d.transform.app(ctx)
        
        ctx.beginPath()
        d.definition.draw(ctx)
        
        drawCallback(ctx, d.definition.draw, d.componentPath())
        
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