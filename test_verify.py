from shapely.geometry import Polygon
p = Polygon([(0,0),(1,0),(1,1),(0,1),(0,0)])
try:
    if p: print("Truthy")
except Exception as e:
    print(e)
