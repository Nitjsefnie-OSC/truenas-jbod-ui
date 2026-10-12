"""Synthetic TrueNAS CORE SSH fixtures for shelf stacking and pool lookup (#948).

Every enclosure id, device, GUID, and pool name here is made up. The shapes
follow `sesutil map` and `zpool status` output on CORE 13.
"""

from __future__ import annotations

FRONT_24_ID = "500aaaa00000024"
REAR_12_ID = "500aaaa00000012"
AHCI_4_ID = "300aaaa00000004"
AHCI_6_ID = "300aaaa00000006"
HALF_FRONT_ID = "500bbbb00000001"
HALF_REAR_ID = "500bbbb00000002"
OLD_COMBINED_ID = f"{FRONT_24_ID}+{REAR_12_ID}+{AHCI_4_ID}+{AHCI_6_ID}"


def sesutil_map(*enclosures: tuple[str, str, str, int, dict[int, str]]) -> str:
    """Build `sesutil map` text from (ses, name, id, bays, {slot: device})."""

    lines: list[str] = []
    for ses_device, name, enclosure_id, bays, devices in enclosures:
        ahci = "AHCI SGPIO" in name
        lines.extend([f"{ses_device}:", f"\tEnclosure Name: {name}", f"\tEnclosure ID: {enclosure_id}"])
        for slot in range(bays):
            device = devices.get(slot)
            lines.append(f"\tElement {slot + 1}, Type: Array Device Slot")
            lines.append(
                "\t\tStatus: OK (0x01 0x00 0x00 0x00)"
                if device
                else "\t\tStatus: Not Installed (0x05 0x00 0x00 0x00)"
            )
            lines.append(f"\t\tDescription: Slot {slot:02d}" if ahci else f"\t\tDescription: Slot{slot:02d}")
            if device:
                lines.append(f"\t\tDevice Names: {device},pass{len(lines)}")
    return "\n".join(lines)


# A Supermicro SSG-6048R on CORE: a 24-bay front and a 12-bay rear SAS
# backplane, each with its own inferred layout, plus two AHCI SGPIO
# pseudo-enclosures for the onboard SATA ports (boot SATADOMs on ada0/ada1).
SSG_SESUTIL_MAP = sesutil_map(
    ("ses0", "LSI SAS3x40 0601", FRONT_24_ID, 24, {slot: f"da{slot}" for slot in range(6)}),
    ("ses1", "LSI SAS3x28 0601", REAR_12_ID, 12, {}),
    ("ses2", "AHCI SGPIO Enclosure 2.00", AHCI_4_ID, 4, {0: "ada0", 1: "ada1"}),
    ("ses3", "AHCI SGPIO Enclosure 2.00", AHCI_6_ID, 6, {}),
)

# One 60-bay top-loader that reports two 30-bay SES groups, plus a separate
# 24-bay head backplane with its own layout and an AHCI pseudo-enclosure.
TOP_LOADER_SESUTIL_MAP = sesutil_map(
    ("ses0", "AHCI SGPIO Enclosure 2.00", AHCI_6_ID, 6, {}),
    ("ses1", "LSI SAS3x40 0601", FRONT_24_ID, 24, {}),
    ("ses2", "LSI-F SAS3x48Front 0c04", HALF_FRONT_ID, 30, {0: "da10"}),
    ("ses3", "LSI-R SAS3x48Rear 0c04", HALF_REAR_ID, 30, {0: "da40"}),
)

# `zpool status -gP` prints every vdev as a GUID, so nothing is keyed by device.
ZPOOL_STATUS_GP = """
  pool: boot-pool
 state: ONLINE
config:

\tNAME                        STATE     READ WRITE CKSUM
\tboot-pool                   ONLINE       0     0     0
\t  11110000000000000001      ONLINE       0     0     0
\t    11110000000000000002    ONLINE       0     0     0
\t    11110000000000000003    ONLINE       0     0     0

errors: No known data errors

  pool: synthpool
 state: ONLINE
config:

\tNAME                        STATE     READ WRITE CKSUM
\tsynthpool                   ONLINE       0     0     0
\t  22220000000000000001      ONLINE       0     0     0
\t    22220000000000000010    ONLINE       0     0     0
\t    22220000000000000011    ONLINE       0     0     0
\t    22220000000000000012    ONLINE       0     0     0
\t    22220000000000000013    ONLINE       0     0     0
\t    22220000000000000014    ONLINE       0     0     0
\t    22220000000000000015    ONLINE       0     0     0

errors: No known data errors
""".strip("\n")

# `zpool status -LP` names each member by its real device node.
ZPOOL_STATUS_LP = """
  pool: boot-pool
 state: ONLINE
config:

\tNAME             STATE     READ WRITE CKSUM
\tboot-pool        ONLINE       0     0     0
\t  mirror-0       ONLINE       0     0     0
\t    /dev/ada0p2  ONLINE       0     0     0
\t    /dev/ada1p2  ONLINE       0     0     0

errors: No known data errors

  pool: synthpool
 state: ONLINE
config:

\tNAME             STATE     READ WRITE CKSUM
\tsynthpool        ONLINE       0     0     0
\t  raidz2-0       ONLINE       0     0     0
\t    /dev/da0p2   ONLINE       0     0     0
\t    /dev/da1p2   ONLINE       0     0     0
\t    /dev/da2p2   ONLINE       0     0     0
\t    /dev/da3p2   ONLINE       0     0     0
\t    /dev/da4p2   ONLINE       0     0     0
\t    /dev/da5p2   ONLINE       0     0     0

errors: No known data errors
""".strip("\n")
