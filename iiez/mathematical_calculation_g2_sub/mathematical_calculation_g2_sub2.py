import streamlit as st
import numpy as np
import plotly.graph_objects as go

def triangle_area(p1, p2, p3):
    a = np.linalg.norm(np.array(p1) - np.array(p2))
    b = np.linalg.norm(np.array(p2) - np.array(p3))
    c = np.linalg.norm(np.array(p3) - np.array(p1))
    s = (a + b + c) / 2
    return np.sqrt(s * (s - a) * (s - b) * (s - c))

def calculate_surface_area(points, faces):
    return sum(triangle_area(points[v[0]], points[v[1]], points[v[2]]) +
               triangle_area(points[v[0]], points[v[2]], points[v[3]]) for v in faces)

def calculate_volume(points, faces):
    volume = 0
    for face in faces:
        p1, p2, p3, p4 = [np.array(points[v]) for v in face]
        tetrahedron_volume = np.abs(np.dot(p1, np.cross(p2 - p1, p3 - p1))) / 6
        volume += tetrahedron_volume
    return volume

def create_3d_plot(points, faces):
    fig = go.Figure()
    for face in faces:
        coords = [points[v] for v in face]
        for i in range(4):
            fig.add_trace(go.Scatter3d(
                x=[coords[i][0], coords[(i+1) % 4][0]],
                y=[coords[i][1], coords[(i+1) % 4][1]],
                z=[coords[i][2], coords[(i+1) % 4][2]],
                mode='lines',
                line=dict(color='blue', width=3)
            ))

    x, y, z = zip(*points.values())
    fig.add_trace(go.Scatter3d(x=x, y=y, z=z, mode='markers+text',
                               marker=dict(size=6, color='red'),
                               text=list(points.keys()), textposition='top center'))
    
    fig.update_layout(scene=dict(xaxis_title='X', yaxis_title='Y', zaxis_title='Z'),
                      margin=dict(l=0, r=0, b=0, t=0))
    return fig

st.set_page_config(page_title="3D Geometry Visualization", layout="wide")

points = {
    'A': [-1, 0, 8], 'B': [-5, 0, 8], 'C': [-5, 10, 8], 'D': [-1, 10, 8],
    'E': [-1, 10, 5], 'F': [-5, 10, 5], 'G': [-5, 3, 5], 'H': [-1, 3, 5],
    'I': [-1, 3, 0], 'J': [-5, 3, 0], 'K': [-5, 0, 0], 'L': [-1, 0, 0]
}

faces = [
    ('A', 'B', 'C', 'D'),
    ('D', 'E', 'F', 'C'),
    ('E', 'H', 'G', 'F'),
    ('H', 'I', 'J', 'G'),
    ('I', 'L', 'K', 'J'),
    ('L', 'A', 'B', 'K')
]

surface_area = calculate_surface_area(points, faces)
volume = calculate_volume(points, faces)

col1, col2 = st.columns([2, 1])

with col1:
    st.plotly_chart(create_3d_plot(points, faces), use_container_width=True)

with col2:
    st.subheader("Calculated Values")
    st.write(f"**Total Surface Area:** {surface_area:.2f} square units")
    st.write(f"**Total Volume:** {volume:.2f} cubic units")
