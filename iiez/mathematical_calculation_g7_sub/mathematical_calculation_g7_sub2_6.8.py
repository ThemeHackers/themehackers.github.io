import numpy as np
from scipy.spatial import ConvexHull

points = np.array([
    [4, -2, -1], [4, -1, -2], [4, -2, -3], [4, -3, -2],
    [0, -3, -2], [0, -2, -3], [0, -1, -2], [0, -2, -1],
    [4, 2, -1], [4, 3, -2], [4, 2, -3], [4, 1, -2],
    [0, 1, -2], [0, 2, -3], [0, 3, -2], [0, 2, -1]
])

hull = ConvexHull(points)


volume = hull.volume

surface_area = hull.area


print(f"Volume: {volume}")
print(f"Surface Area: {surface_area}")
