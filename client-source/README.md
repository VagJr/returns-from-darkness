# Returns from Darkness HD 0.4.0

Community client adapted from The Hell 3 source 1.265 and data1.267, with native creator-hosted rooms, a signed updater, and Sanctuary progression. Existing gameplay/artwork is credited to its original projects; see ORIGINAL-SOURCE-README.txt and the project NOTICE.md.

Apply engine.patch to TH3 1.265 in candidates/thehell3. The patch contains the account progression hooks and generated rules. Build the native/thehell3-online rfd_room library first. Build the engine with Win32 MSVC v145, Windows SDK10.0.26100.0, /MT and /Z7. RfdDevQa defaults to0: keep that value in public builds. The original source README must remain with redistributions.

The companion uses libdatachannel0.24.6 (commit6b1e2e620f1e37f0eafeee702eaea0043cb305fd, recursive submodules) and Mbed TLS3.6.5 (commite185d7fd85499c8ce5ca2a54f5cf8fe7dbe3f8df). Fetch these official projects into native/vendor/libdatachannel and native/vendor/mbedtls. Configure native/peer-bridge with CMake for Windowsx64 and build RfdPeer in Release.

Compile launcher/Launcher.cs and launcher/Lang.cs for .NET Framework4 with WinForms, Drawing, Security, Web.Extensions, IO.Compression and IO.Compression.FileSystem assemblies. Embed launcher/assets/{sanctuary.jpg,logo.gif,title.ttf,body.ttf,launcher-locales.json} under those exact names and launcher/update-public.xml as update-public.xml. The setup additionally embeds initial.zip containing the signed release.json. No private signing key is included.

Account progression rules are in content/progression/rules.json, services/peer-realm/progression-rules.mjs and the generated native header. Preserve engine mode IDs: Normal0, Hardcore1, Ironman2, Nightmare3, Easy4, Survival5, Hard6, Speedrun7, Coliseum8. Perks, trait conflicts, class restrictions and item requirements remain engine-side. Imported saves preserve access without generating completion seals. Native reports are client-reported and unranked, not authoritative anti-cheat attestation.

Cloudflare uses SQLite Durable Objects for accounts, chat, discovery, profiles and relay fallback. Simulation stays in the room creator's client, using reliable ordered WebRTC when possible. Restrictive networks can use the authenticated cloud relay. No automatic host migration or authoritative ranked PvP. The Coliseum room route remains experimental.

The public setup imports DIABDAT.MPQ and matching TH3data.mor on first preparation. Full save files stay on the player's PC; the Sanctuary profile is not a cloud save backup. Whole-world HD art and a project-original HUD/item collection remain future work.
