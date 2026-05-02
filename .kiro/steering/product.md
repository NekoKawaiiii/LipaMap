# LipaMap — Product Overview

LipaMap is a GIS (Geographic Information System) dashboard for Lipa City, Batangas, Philippines. It maps and tracks **green infrastructure** (parks, community gardens, urban forests, wetlands) and **waste management** facilities (recycling centers, composting sites, collection points) across the city's barangays.

## Key Features
- Interactive Leaflet map centered on Lipa City with bounded panning
- Category-based filtering via sidebar nav and chip buttons
- Location detail panel with photos, coordinates, and metadata
- Heatmap overlay for density visualization
- Street / satellite tile layer toggle
- Admin mode (password-protected) for adding, editing, and deleting locations
- Custom category management (admin only)
- Location data persisted in PostgreSQL (Neon); images stored in Cloudinary
- Responsive layout with mobile drawer navigation
- Statistics sidebar showing per-category counts

## Target Users
- City environment officers and planners (admin)
- General public / residents (viewer mode)

## Geographic Scope
Lipa City, Batangas — coordinates bounded to roughly 13.87–14.03°N, 121.10–121.24°E.
