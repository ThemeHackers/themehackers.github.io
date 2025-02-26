import numpy as np


points = {
    'G': [-6, -1, 1], 'J': [-10, -1, 1], 'I': [-10, 3, 1], 'H': [-6, 3, 1],
    'L': [-6, -1, -6], 'K': [-10, -1, -6], 'N': [-10, 3, -6], 'M': [-6, 3, -6]
}


def distance(p1, p2):
    return np.linalg.norm(np.array(p1) - np.array(p2))


length = distance(points['G'], points['H'])
width = distance(points['G'], points['L'])   
height = distance(points['G'], points['J'])  


surface_area = 2 * (length * width + width * height + height * length)


volume = length * width * height


print(f"Total Surface Area: {surface_area} square units")
print(f"Total Volume: {volume} cubic units")
