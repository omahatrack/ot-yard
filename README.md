# OTE Equipment Hub — GoDaddy Generator v8

This package prepares the final GoDaddy deployment ZIP on a Windows PC with Node 22 LTS.

## Fix in v8
The application itself already passed Prisma generation, all 10 business-rule tests, and the full Next.js production build in v7. The remaining failure was only the Windows ZIP-creation step.

v8 replaces the robocopy/tar packaging path with a Node-based ZIP creator using `archiver`. This avoids Windows `tar`/`robocopy` exit-code and path handling issues.

## Use
1. Extract this generator to a normal local folder.
2. Double-click `PREPARE_GODADDY_DEPLOY.bat`.
3. Wait for `READY FOR GODADDY`.
4. Upload `OT_Equipment_GoDaddy_Deploy_v8.zip` to GoDaddy.

The final ZIP excludes `node_modules`, `.next`, `.git`, the local package lock, and the preparation batch file. It includes the locally generated Prisma client under `src/generated/prisma`.

V21 note: Dashboard equipment list and KPI now exclude archived equipment using normalized SQL status filtering.
