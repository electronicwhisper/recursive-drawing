module.exports = {
  edgeSize: 0.7
  expansionLimit: 300
  minSize: 0.0000002 # this should get set to be 1/maxDimension where maxDimension is the largest dimension of the workspace canvas
  maxSize: 8
  fillInTime: 1800 # amount of time before we start further recursing on the main workspace, in milliseconds
  leafLimit: 1000000 # so it doesn't crash the browser :'(
  normalizeConstant: 200 # fix for stupid Chrome bug, http://code.google.com/p/chromium/issues/detail?can=2&start=0&num=100&q=&colspec=ID%20Pri%20Mstone%20ReleaseBlock%20Area%20Feature%20Status%20Owner%20Summary&groupby=&sort=&id=120692
}