module.exports = {
  edgeSize: 0.7
  minScale: 0.1
  maxScale: 1000000 # this will get set when the window resizes
  expansionLimit: 300
  minSize: 0.000001 # this should get set to be 1/maxDimension where maxDimension is the largest dimension of the workspace canvas
  maxSize: 8
}