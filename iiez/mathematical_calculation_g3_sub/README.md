# Hemisphere Surface Area and Volume Calculation

This program calculates the surface area and volume of a hemisphere given the coordinates of its diameter endpoints.

## Given Points
- **I(-3, -9, 4)**
- **J(-3, -5, 4)**

## Calculations

### Step 1: Compute Radius
The radius \( r \) is half of the distance between points I and J:

\[
d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2 + (z_2 - z_1)^2}
\]

\[
d = \sqrt{(-3 + 3)^2 + (-5 + 9)^2 + (4 - 4)^2}
\]

\[
d = \sqrt{0 + 16 + 0} = \sqrt{16} = 4
\]

\[
r = \frac{d}{2} = \frac{4}{2} = 2
\]

### Step 2: Surface Area
The total surface area of a hemisphere consists of the curved surface and the base circle:

\[
A_{\text{curve}} = 2\pi r^2
\]

\[
A_{\text{base}} = \pi r^2
\]

\[
A_{\text{total}} = 3\pi r^2
\]

Substituting \( r = 2 \):

\[
A_{\text{total}} = 3\pi (2)^2 = 3\pi (4) = 12\pi
\]

Approximating with \( \pi \approx 3.14 \):

\[
A_{\text{total}} \approx 12 \times 3.14 = 37.68
\]

### Step 3: Volume
The volume of a hemisphere is:

\[
V = \frac{1}{2} \times \frac{4}{3} \pi r^3 = \frac{2}{3} \pi r^3
\]

Substituting \( r = 2 \):

\[
V = \frac{2}{3} \pi (2)^3 = \frac{2}{3} \pi (8) = \frac{16}{3} \pi
\]

Approximating:

\[
V \approx \frac{16}{3} \times 3.14 = 16.75
\]

## Final Results
- **Surface Area:** \( 12\pi \) or **37.68** (approx.)
- **Volume:** \( \frac{16}{3} \pi \) or **16.75** (approx.)

## Usage
Run the Python script to compute the values dynamically.
