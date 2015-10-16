# Description of the OPC algorithm

The orientation patch count is a two-fold process. First, the orientation of each vertex about the camera forward vector must be calculated. This is performed in the `mesh_tools.js` module, in the `surfaceOrientation` function. Given an array of normal vectors, the function calculates a scalar value for for each normal indicating in which region the normal vector projects in a circle about the camera forward vector.

Patches are formed between neighboring vertices possessing the same orientation value.

The orientation patch count algorithm is a graph-based algorithm. It traversers each patch in a depth-first manner, and counts it when it has traversed all vertices within a patch. The algorithm looks like this in pseudo-code.

```
# M is the array of vertices
# N is the neighbor list
# O is the array containing the orientation values corresponsing to the normals
# limit is a scalar indicating the minimum size that a patch must be for it to be counted
opc( M, N, O, limit ):
  count = 0;
  # the stack is used to store vertices which are in an unexplored patch
  stack = new Stack()
  E = [ M.count, false ]
  do
    i = stack.pop()
    if not E(i):
      size = explore( M, N, O, E, stack, i )
      if size > limit: 
        count += 1
  while not stack.empty()
  return count
  
# M as before
# N as before
# O as before
# E an array stating whether an index has been visited already
# the stack of indices
# an index to start exploring at
# returns the size of the explored patch
explore( M, N, O, E, S, i ):
  recursion = []
  size = 0
  recursion.push( i )
  do
    k = recursion.pop()
    E(k) = true
    a = nil
    b = nil
    for n in N(k):
      if not E(n):
        if O(n) == O(k):
          b = a
          # perform vector math to calculate size of triangle fan
          # which the current and previous neighbors form
          a = M(n) - M(k)
          if both a and b exist:
            size += a.cross( b )    # take the vector cross product
            recursion.push( n )
        else:
          # else, the orientations are different, and we've just reached
          # a patch boundary
          # push a new patch into the stack
          stack.push( n )
  while not recursion.empty()
  return size
```

We use `limit` to define a size limit for a patch to be counted. This is require, because this calculation needs to be performed on meshes of varying resolution. Thus not all details will even be visible in the OPC when comparing two meshes of different resolutions.

This algorithm is implemented in `mesh_tools.js`, in the `opc` function. In practise, the `limit` variable is calculated as follows. The total surface area of the mesh is used to calculate the percentage of surface area that each patch inhabits. Thus the limit variable in the code is actually the lower limit of percentage of total surface area after which the patch will no longer be counted into the OPC.