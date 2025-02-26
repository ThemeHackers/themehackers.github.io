import math

points = {
    'A': (4, -5, 2), 'B': (4, -3, 2), 'C': (4, -3, 4), 'D': (4, 3, 4),
    'E': (4, 3, 2), 'F': (4, 5, 2), 'G': (4, 5, -1), 'H': (4, -5, -1),
    'I': (0, -5, -1), 'J': (0, -5, 2), 'K': (0, -3, 2), 'L': (0, -3, 4),
    'M': (0, 3, 4), 'N': (0, 3, 2), 'O': (0, 5, 2), 'P': (0, 5, -1)
}

base_order = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

def calculate_base_area(points, order):
    area = 0
    n = len(order)
    for i in range(n):
        j = (i + 1) % n
        y1, z1 = points[order[i]][1], points[order[i]][2]
        y2, z2 = points[order[j]][1], points[order[j]][2]
        area += (y1 * z2) - (z1 * y2)
    return abs(area) / 2

def calculate_perimeter(points, order):
    perimeter = 0
    n = len(order)
    for i in range(n):
        j = (i + 1) % n
        y1, z1 = points[order[i]][1], points[order[i]][2]
        y2, z2 = points[order[j]][1], points[order[j]][2]
        distance = math.sqrt((y2 - y1)**2 + (z2 - z1)**2)
        perimeter += distance
    return perimeter

height = abs(points['A'][0] - points['I'][0])
base_area = calculate_base_area(points, base_order)
perimeter = calculate_perimeter(points, base_order)
volume = base_area * height
lateral_area = perimeter * height
surface_area = 2 * base_area + lateral_area

print(f"Base area: {base_area:.2f} square units")
print(f"Base perimeter: {perimeter:.2f} units")
print(f"Height: {height} units")
print(f"Volume: {volume:.2f} cubic units")
print(f"Surface area: {surface_area:.2f} square units")
