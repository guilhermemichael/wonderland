# Source Assets

This directory stores the original, unoptimized, high-fidelity 3D assets (GLBs, textures) that serve as the single source of truth for Wonderland's 3D models.

**Rules for this directory:**
1. Do not serve these files directly via the Next.js `public/` directory, as they are likely too large for web delivery.
2. Any asset placed here must be optimized (e.g., using Meshopt/Draco, KTX2/WebP) and exported to `public/models/` before integration into the web application.

## M04 Assets Strategy
- `cheshire_cat.glb` (~31MB, 477k triangles): High-res model with 2K textures. Used as reference or for future expansions. Target web optimization: 60k-120k triangles.
- `pocket_watch.glb` (~22MB, 353k triangles): Includes embedded animations. Primary focus for M04 "Follow the Rabbit". Target web optimization: 30k-80k triangles.
- `delight.glb` (~2MB, 15k triangles): Already lightweight, uses `KHR_materials_clearcoat`. Requires minimal geometric optimization before integration.
