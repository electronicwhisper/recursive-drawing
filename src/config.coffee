module.exports = {
  edgeSize: 0.7
  expansionLimit: 300
  minSize: 0.0000002 # this should get set to be 1/maxDimension where maxDimension is the largest dimension of the workspace canvas
  maxSize: 8
  fillInTime: 1800 # amount of time before we start further recursing on the main workspace, in milliseconds
}