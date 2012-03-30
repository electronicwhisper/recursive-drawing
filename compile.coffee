# Run:
# nodemon --watch src compile.coffee
#
# also (until I factor stylus in here...):
# stylus -w -o compiled/css src/style.styl


stitch = require("stitch")
stylus = require('stylus')
fs = require('fs')

package = stitch.createPackage(
  # Specify the paths you want Stitch to automatically bundle up
  paths: [ __dirname + "/src" ]
  
  # Specify your base libraries
  dependencies: [
    # __dirname + '/lib/jquery.js'
  ]
)


compile = () ->
  package.compile (err, source) ->
    fs.writeFile 'compiled/app.js', source, (err) ->
      if (err) then throw err
      console.log('Compiled app.js')


compile()