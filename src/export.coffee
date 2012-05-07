makePng = () ->
  canvas = $("#forSaving")[0]
  ctx = canvas.getContext("2d")
  
  ctx.clearRect(0,0,canvas.width,canvas.height)
  
  ctx.drawImage($("#workspaceCanvas")[0], 0, 0)
  ctx.drawImage($("#drawFurther")[0], 0, 0)
  
  dataURL = canvas.toDataURL('image/png;base64')
  
  window.open(dataURL)


module.exports = {
  makePng: makePng
}