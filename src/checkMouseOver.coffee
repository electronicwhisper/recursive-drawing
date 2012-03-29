# Takes in a list of draw functions, a canvas context, and a point [x,y]
# Finds the topmost draw function that contains the point
# If found, returns {componentPath: [Component, ...], edge: true|false}
# Else returns undefined

module.exports = (draws, ctx, mousePosition) ->
  ret = undefined
  draws.forEach (d) ->
    d.transform.set(ctx)
    ctx.beginPath()
    d.draw(ctx)
    if ctx.isPointInPath(mousePosition...)
      # see if it's on the edge
      ctx.scale(require("config").edgeSize, require("config").edgeSize)
      ctx.beginPath()
      d.draw(ctx)
      if ctx.isPointInPath(mousePosition...)
        # nope, mouse is in the center of the shape
        ret = {
          componentPath: d.componentPath
          edge: false
        }
      else
        # mouse is on the edge
        ret = {
          componentPath: d.componentPath
          edge: true
        }
  return ret