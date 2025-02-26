import numpy as np
import streamlit as st
import plotly.graph_objects as go
from scipy.spatial import ConvexHull

st.set_page_config(page_title="3D Geometry Visualization", layout="wide")

st.markdown(
    """
    <style>
        .stApp { 
            display: flex; 
            justify-content: center;
            align-items: center;
            height: 100vh; 
            overflow: hidden;
        }
    </style>
    """,
    unsafe_allow_html=True
)

points = {
    'M': [-1, 4, 5], 'N': [-5, 4, 5], 'O': [-5, 5, 4], 'P': [-1, 5, 4],
    'Q': [-5, 5, 2], 'R': [-1, 5, 2], 'S': [-1, 4, 3], 'T': [-5, 4, 3],
}

faces = [
    ['M', 'N', 'O', 'P'], ['O', 'Q', 'R', 'P'], ['Q', 'T', 'S', 'R'], 
    ['M', 'S', 'T', 'N'], ['M', 'P', 'R', 'S'], ['N', 'T', 'Q', 'O']
]

def triangle_area(p1, p2, p3):
    a = np.linalg.norm(np.array(p2) - np.array(p1))
    b = np.linalg.norm(np.array(p3) - np.array(p2))
    c = np.linalg.norm(np.array(p1) - np.array(p3))
    s = (a + b + c) / 2
    return np.sqrt(s * (s - a) * (s - b) * (s - c))

def quad_area(p1, p2, p3, p4):
    return triangle_area(p1, p2, p3) + triangle_area(p1, p3, p4)

total_surface_area = sum(
    quad_area(*[points[v] for v in face]) if len(face) == 4 else 0
    for face in faces
)

def compute_volume_with_hull():
    hull = ConvexHull(list(points.values()))
    return hull.volume

total_volume = compute_volume_with_hull()

def create_plot():
    fig = go.Figure()
    hidden_edges = set()

    for face in faces:
        coords = [points[v] for v in face]
        for i in range(len(coords)):
            edge = tuple(sorted((face[i], face[(i+1) % len(face)])))
            hidden_edges.add(edge)   
            fig.add_trace(go.Scatter3d(
                x=[coords[i][0], coords[(i+1) % len(coords)][0]],
                y=[coords[i][1], coords[(i+1) % len(coords)][1]],
                z=[coords[i][2], coords[(i+1) % len(coords)][2]],
                mode='lines',
                line=dict(color='blue', width=3)
            ))


    all_edges = {(min(a, b), max(a, b)) for face in faces for a, b in zip(face, face[1:] + [face[0]])}
    hidden_edges = all_edges - hidden_edges

    for edge in hidden_edges:
        p1, p2 = points[edge[0]], points[edge[1]]
        fig.add_trace(go.Scatter3d(
            x=[p1[0], p2[0]],
            y=[p1[1], p2[1]],
            z=[p1[2], p2[2]],
            mode='lines',
            line=dict(color='gray', width=2, dash='dash')
        ))


    x, y, z = zip(*points.values())
    fig.add_trace(go.Scatter3d(x=x, y=y, z=z, mode='markers+text',
                               marker=dict(size=6, color='red'),
                               text=list(points.keys()), textposition='top center'))
    
    fig.update_layout(scene=dict(xaxis_title='X', yaxis_title='Y', zaxis_title='Z'),
                      margin=dict(l=0, r=0, b=0, t=0))
    return fig

col1, col2 = st.columns([2, 1])

with col1:
    st.plotly_chart(create_plot(), use_container_width=True)

with col2:
    st.subheader("Calculated Values")
    st.write(f"**Total Surface Area:** {total_surface_area:.2f} square units")
    st.write(f"**Total Volume:** {total_volume:.2f} cubic units")

