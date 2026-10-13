Returns from Darkness HD 0.3.6

Connection hotfix for new installations. The native companion now reads Windows environment paths as Unicode and writes its readiness/status files atomically. The previous companion failed in profile paths containing accented or non-Latin characters. A clean new-account creator test reproduced the failure in 0.3.5 and passed with this correction.

The launcher keeps the first-installation data selector in front, copies files without freezing the interface, validates the matching resource package and renews room invitations after long preparation. Missing/truncated data is reported explicitly. Damaged installed packages are repaired from the signed release while character files remain outside version folders. Account/update requests have bounded network timeouts. Startup failures produce a local diagnostic with credentials removed.

The current Sanctuary progression/profile expansion is not part of this maintenance release. Existing characters, rates and multiplayer rules are preserved. Whole-world HD art, host migration, browser gameplay and authoritative ranked PvP remain unfinished. Existing compatible game data is still required during first preparation. This package uses a signed update manifest; trusted-publisher Authenticode signing is not yet available.
