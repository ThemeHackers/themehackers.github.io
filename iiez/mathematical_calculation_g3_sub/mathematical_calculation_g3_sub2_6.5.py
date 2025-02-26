import numpy as np

def triangle_area(p1, p2, p3):
  
    a = np.linalg.norm(np.array(p1) - np.array(p2))
    b = np.linalg.norm(np.array(p2) - np.array(p3))
    c = np.linalg.norm(np.array(p3) - np.array(p1))
    s = (a + b + c) / 2
    return np.sqrt(s * (s - a) * (s - b) * (s - c))

def calculate_volume(points, faces):
   
    volume = 0
    for face in faces:
        p1, p2, p3, p4 = [np.array(points[v]) for v in face]
        tetrahedron_volume = np.abs(np.dot(p1, np.cross(p2 - p1, p3 - p1))) / 6
        volume += tetrahedron_volume
    return volume

def calculate_surface_area(points, faces):

    area = 0
    for face in faces:
        p1, p2, p3, p4 = [points[v] for v in face]
        area += triangle_area(p1, p2, p3) + triangle_area(p1, p3, p4)
    return area

points = {
    'A': [0, -13, 4], 'B': [-6, -13, 4], 'C': [-6, -1, 4], 'D': [0, -1, 4],
    'E': [1, -2, 1], 'F': [-5, -2, 1], 'G': [-5, -14, 1], 'H': [1, -14, 1]
}

faces = [
    ('A', 'B', 'C', 'D'),
    ('E', 'F', 'G', 'H'),
    ('A', 'B', 'G', 'H'),
    ('D', 'C', 'F', 'E'),
    ('A', 'D', 'E', 'H'),
    ('B', 'C', 'F', 'G')
]

surface_area = calculate_surface_area(points, faces)
volume = calculate_volume(points, faces)

print(f"Surface Area: {surface_area:.2f} square units")
print(f"Volume: {volume:.2f} cubic units")