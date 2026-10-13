# Health and mana vessel provenance

The two runtime vessel atlases adapt the complete health and mana animation frames from **Tchernobog 0.2.2f**, specifically the named PNG resources inside `patch.mpq`. Their statues, framing and liquid are inherited artwork and are not claimed as original Returns from Darkness artwork. The archive hash, resource names, source frame hashes, source bounds and atlas hashes are recorded in `orb-atlases.json`.

Each resource has 48 frames. Each original 256×256 RGBA canvas is preserved exactly in one tile of the 8×6, 2048×1536 atlas, without resampling or upscaling. The canvas includes transparent margins, vessel artwork and framing; the useful liquid diameter is approximately 110 pixels. The full source canvas does not imply a 256-pixel liquid sphere.

The project renderer composes the inherited outer vessel separately from the circular liquid area, supplies an independent resource fill mask and advances both layers with the same elapsed-time frame index. A maximum resource value reaches the upper liquid row; zero represents an empty vessel. The shader and clipping do not increase the native detail of the inherited frames.

The public source package includes only `health-vessel-atlas.png`, `mana-vessel-atlas.png`, sanitized vessel metadata and this document. It excludes extraction previews, optional liquid crop atlases, raw audit frames, private analysis paths and the archive itself. Copy both vessel atlases to `assets/remaster` when rebuilding the client. Third-party assets retain their respective ownership and notices.
