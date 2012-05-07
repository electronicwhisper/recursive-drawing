module.exports = {
  stats: () ->
    stats = new Stats();
    
    stats.getDomElement().style.position = 'absolute'
    stats.getDomElement().style.left = '0px'
    stats.getDomElement().style.bottom = '0px'
    
    document.body.appendChild( stats.getDomElement() )
    setInterval((() -> stats.update()), 1000/60)
}