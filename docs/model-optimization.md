# WONDERLAND - Model Optimization

## `pocket-watch.web.glb`

* **Source Asset:** `source-assets/pocket_watch.glb` (21.9 MB, 352,888 triangles)
* **Target Spec:** 30k-80k triangles, ≤ 3MB
* **Pipeline:** `@gltf-transform/cli simplify` and Draco/Meshopt compression.
* **Final Size:** 2.48 MB
* **Final Triangles:** ~70k (20% of original)
