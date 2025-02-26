import numpy as np
import plotly.graph_objects as go
import streamlit as st
from scipy.spatial import ConvexHull

points = {
    'A': [-8, -7, 5], 'B': [-8, 1, 9], 'C': [-8, 9, 5], 'D': [-8, 1, 1],
    'E': [-5, 1, 5], 'F': [-11, 1, 5]
}

points_array = np.array(list(points.values()))
hull = ConvexHull(points_array)

st.title("3D Convex Hull Calculation")
st.write(f"**Surface Area:** {hull.area:.2f} square units")
st.write(f"**Volume:** {hull.volume:.2f} cubic units")

x, y, z = zip(*points_array)
scatter = go.Scatter3d(
    x=x, y=y, z=z, mode='markers+text', marker=dict(size=6, color='yellow', opacity=0.8),
    text=list(points.keys()), textposition="top center"
)

lines = [
    go.Scatter3d(
        x=[points_array[simplex[i], 0], points_array[simplex[(i+1) % 3], 0]],
        y=[points_array[simplex[i], 1], points_array[simplex[(i+1) % 3], 1]],
        z=[points_array[simplex[i], 2], points_array[simplex[(i+1) % 3], 2]],
        mode='lines', line=dict(color='magenta', width=3)
    )
    for simplex in hull.simplices for i in range(3)
]

fig = go.Figure(data=[scatter] + lines, layout=go.Layout(
    title="Interactive 3D Convex Hull", scene=dict(xaxis_title="X", yaxis_title="Y", zaxis_title="Z")
))

st.plotly_chart(fig)
