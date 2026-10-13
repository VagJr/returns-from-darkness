# Returns from Darkness 0.3.1

Native peer transport, launcher, serverless community and engine patch used by this release.
Apply `engine.patch` to the published TH3 1.265 source. Keep ORIGINAL-SOURCE-README.txt with redistributions.
Place the patched engine in `candidates/thehell3`. Configure Win32 MSVC v145, Windows SDK 10.0.26100.0, /MT, /Z7. Build native/thehell3-online first and link its rfd_room.lib.

The companion uses libdatachannel v0.24.6 (commit 6b1e2e620f1e37f0eafeee702eaea0043cb305fd) with recursive submodules and Mbed TLS mbedtls-3.6.5 (commit e185d7fd85499c8ce5ca2a54f5cf8fe7dbe3f8df). Clone both official repositories to native/vendor/libdatachannel and native/vendor/mbedtls. Configure native/peer-bridge with CMake for Windows x64 and compile target RfdPeer, Release.

Compile launcher/Launcher.cs for .NET Framework 4 with WinForms, Drawing, Web.Extensions and IO.Compression assemblies. Embed update-public.xml as update-public.xml. Installer additionally embeds initial.zip. The signing private key is never included.

Each room creator runs the native game and companion. The original deterministic turn protocol remains reliable and ordered. Direct WebRTC uses DTLS/SCTP, MTU 1200, bounded queues and event-driven local I/O. A Cloudflare WebSocket relay handles restrictive networks after 15 seconds. Signaling alone can disconnect without terminating established direct gameplay. Cloud relay requires the service to remain reachable and consumes Cloudflare quotas.

Cloudflare worker uses SQLite Durable Objects. Accounts, chat and room discovery are cloud-side; gameplay simulation stays in player clients. No automatic host migration or authoritative ranked PvP. The Coliseum mode uses separate engine saves and remains experimental. No claim of whole-world HD art.

The public package imports the user's DIABDAT.MPQ and matching TH3data.mor; neither is included here.
