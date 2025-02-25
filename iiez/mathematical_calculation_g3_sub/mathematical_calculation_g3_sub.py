import math

def distance(point1, point2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(point1, point2)))

def hemisphere_properties(point1, point2):
    radius = round(distance(point1, point2) / 2, 2)
    surface_area = f"{round(3 * radius ** 2, 2)}π"
    volume = f"{round((2 / 3) * radius ** 3, 2)}π"
    return radius, surface_area, volume

I = (-3, -9, 4)
J = (-3, -5, 4)

radius, surface_area, volume = hemisphere_properties(I, J)

print(f"Radius: {radius}")
print(f"Total Surface Area: {surface_area} square units")
print(f"Volume: {volume} cubic units")
