# Zebra Technologies — Product Knowledge Log

**Last updated:** 2026-04-07 (session 2 — full refresh + merge)
**Source:** Official Zebra website (zebra.com product pages), Zebra success stories, prior session data
**Company ID:** `5a8ba919-dd49-4f92-a420-11cbc7458cf0`
**Products in DB:** 48

---

## What was done (session 2)

- Discovered 42 products already existed from a previous session (session 1)
- Used a research agent to scrape 22 fresh products from actual zebra.com product pages (TC73, TC78, TC53, etc.) with polished descriptions, use_cases, customers, competitors
- Inserted the 22 fresh products, then deduped: deleted old-session duplicates by name/category/sort_order
- Kept unique old-session products not covered by the fresh 22 (AMRs, healthcare variants, extra tablet models, VisibilityIQ, Aurora Vision Studio, etc.)
- Updated image URLs on fresh records using confirmed better paths found in old-session data (software CDN path: `product-cards/software/`, ET40, CC6000, FXR90, LI3678)
- Final result: 48 unique, deduplicated products

### If re-running from scratch
```sql
DELETE FROM company_products WHERE company_id = '5a8ba919-dd49-4f92-a420-11cbc7458cf0';
```
Then re-run the full insert from this file's product table.

---

## Confirmed working image CDN patterns

### Pattern 1 — Model card (most common)
```
https://www.zebra.com/content/dam/zebra_dam/global/zcom-web-production/web-production-photography/product-cards/model/{SLUG}-3x2-3600.jpg
```
**Confirmed working slugs:**
- `mc3300ax`, `zt411`, `zt620`, `zd421`, `zd621`, `zd621r`, `zq630`, `ds8178`, `ds457`, `li3678`, `fxr90`
- `tc73-photography-product-front-right-without-shadow`
- `tc78-photography-product-front-right-without-shadow`
- `tc53-photography-product-front-right-without-shadow`
- `et40-photography-product-front-right-without-shadow`
- `et45-photography-product-front-right-without-shadow`
- `et60-photography-product-front-right-without-shadow`
- `et8x`, `cc6x`, `cc600-photography-product-front-right-without-shadow`
- `zec500-photography-product-front-right-without-shadow`
- `tc22r-photography-product-front-right-without-shadow`
- `mc3300r`, `mc3390r`, `li3678-er` (wait, li3678-er returned the li3678 slug image)
- `amr-roller`, `amr-flex`, `amr-flex-dual`

### Pattern 2 — Software
```
https://www.zebra.com/content/dam/zebra_dam/global/zcom-web-production/web-production-photography/product-cards/software/{SLUG}-3x2-3600.jpg
```
**Confirmed working:** `workcloud`, `zebra-dna`, `visibilityiq`, `aurora-vision`

### Pattern 3 — Web folder (older/lifestyle)
```
https://www.zebra.com/content/dam/zebra_dam/global/zcom-web-production/web-production-photography/{webXXX}/{filename}-3x2-3600.jpg
```
**Confirmed working:**
- `web004/wt6400-photography-website-front-facing-no-shadow-3x2-3600.jpg`
- `web001/zc300-series-left-facing-3x2-3600.jpg`
- `web005/ds8178hc-cr8178-photography-website-right-down-white-3x2-3600.jpg`
- `web005/ds3678-photography-website-cradle-right-angle-3x2-3600.jpg`

### Not yet found
- **VC8300** — no confirmed image URL across `product-cards/model/vc8300*`, `web001/vc8300*`, or product page (`/products/mobile-computers/vehicle-mount/vc8300.html` → 404). The product page URL seems to be different.

---

## Product registry (48 products)

### Mobile Computers (11)
| Sort | Name | Image status |
|------|------|-------------|
| 1 | TC73 Ultra-Rugged Mobile Computer | ✅ product-cards/model |
| 2 | TC78 Ultra-Rugged Mobile Computer | ✅ product-cards/model |
| 3 | TC53 Rugged Mobile Computer | ✅ product-cards/model |
| 3 | MC9400 Mobile Computer | ✅ (from session 1) |
| 4 | MC3300ax Rugged Mobile Computer | ✅ product-cards/model |
| 4 | MC9300 Mobile Computer | ✅ (from session 1) |
| 5 | VC8300 Vehicle-Mounted Computer | ❌ NULL — URL unknown |
| 5 | MC3300 Mobile Computer | ✅ (from session 1) |
| 6 | WT6400 Wearable Computer | ✅ web004 |
| 6 | VC80X Vehicle Mount Computer | ✅ (from session 1) |
| 8 | HC50 Healthcare Mobile Computer | ✅ (from session 1) |

### Printers (11)
| Sort | Name | Image status |
|------|------|-------------|
| 7 | ZT411 Industrial Label Printer | ✅ product-cards/model |
| 8 | ZT620 High-Performance Industrial Printer | ✅ product-cards/model |
| 9 | ZD421 Advanced Desktop Printer | ✅ product-cards/model |
| 10 | ZD621 Premium Desktop Printer | ✅ product-cards/model |
| 10 | ZT610 Industrial Printer | ✅ (from session 1) |
| 11 | ZQ630 Plus Mobile Printer | ✅ product-cards/model |
| 12 | ZC300 Card and Badge Printer | ✅ web001 |
| 13 | ZD230 Desktop Printer | ✅ (from session 1) |
| 15 | ZD600 Desktop Printer | ✅ (from session 1) |
| 16 | ZQ620 Plus Mobile Printer | ✅ (from session 1) |
| 18 | ZE511 Print Engine | ✅ (from session 1) |

### Scanners (6)
| Sort | Name | Image status |
|------|------|-------------|
| 13 | DS8178 Cordless Handheld Scanner | ✅ product-cards/model |
| 14 | LI3678 Ultra-Rugged Linear Scanner | ✅ product-cards/model (li3678) |
| 15 | DS457 Fixed Mount Hands-Free Scanner | ✅ product-cards/model |
| 31 | DS8178-HC Healthcare Scanner | ✅ web005 |
| 32 | DS3678 Ultra-Rugged Scanner | ✅ web005 |
| 33 | LI3678-ER Ultra-Rugged Scanner | ✅ product-cards/model |

### RFID (5)
| Sort | Name | Image status |
|------|------|-------------|
| 16 | FXR90 Ultra-Rugged Fixed RFID Reader | ✅ product-cards/model (fxr90) |
| 17 | ZD621R RFID Desktop Printer | ✅ product-cards/model |
| 40 | TC22R Handheld RFID Reader | ✅ product-cards/model |
| 41 | MC3330R RFID Mobile Computer | ✅ product-cards/model |
| 42 | MC3390R RFID Mobile Computer | ✅ product-cards/model |

### Tablets (4)
| Sort | Name | Image status |
|------|------|-------------|
| 18 | ET40 Enterprise Tablet | ✅ product-cards/model |
| 51 | ET45 Enterprise Tablet | ✅ product-cards/model |
| 52 | ET60 Enterprise Tablet | ✅ product-cards/model |
| 53 | ET80 / ET85 Rugged Tablet | ✅ product-cards/model (et8x) |

### Kiosks & Automation (3)
| Sort | Name | Image status |
|------|------|-------------|
| 19 | CC6000 Customer Concierge Kiosk | ✅ product-cards/model (cc6x) |
| 60 | CC600 Customer Concierge Kiosk | ✅ product-cards/model |
| 62 | ZEC500 Enterprise Computer | ✅ product-cards/model |

### Software (5)
| Sort | Name | Image status |
|------|------|-------------|
| 20 | Workcloud Workforce Optimization Suite | ✅ product-cards/software |
| 21 | Workcloud Inventory Optimization Suite | ✅ product-cards/software (workcloud) |
| 22 | Zebra DNA Device Intelligence Platform | ✅ product-cards/software |
| 82 | VisibilityIQ Foresight | ✅ product-cards/software |
| 83 | Aurora Vision Studio | ✅ product-cards/software |

### Autonomous Mobile Robots (3)
| Sort | Name | Image status |
|------|------|-------------|
| 70 | Zebra Roller AMR | ✅ product-cards/model (amr-roller) |
| 71 | Zebra Flex Guide AMR | ✅ product-cards/model (amr-flex) |
| 72 | Zebra Flex Guide Dual AMR | ✅ product-cards/model (amr-flex-dual) |

---

## Key customers (named in Zebra success stories)
| Customer | Industry | Products |
|----------|----------|---------|
| Walgreens | Retail/Pharmacy | Workcloud, DS8178, ZD421 |
| Lowe's | Home Improvement | CC6000, Workcloud Inventory |
| Texas Children's Hospital | Healthcare | ZD621R RFID, ZD621 |
| Evri | Delivery/Logistics | TC78, ZQ630 |
| Waitrose | Grocery Retail | ZD621, Workcloud Workforce |
| Primark | Fashion Retail | TC53, Workcloud Inventory |
| EDEKA | Grocery | TC73, ZD621 |
| Siemens Healthineers | Healthcare | ZD621R, Zebra DNA |
| Fonterra | Food/Cold Chain | WT6400, FXR90 |
| McDonald's Brazil | QSR | Workcloud Workforce |

## Competitors by category
| Category | Key Competitors |
|----------|----------------|
| Mobile Computers | Honeywell (CT30 XP, CT45 XP, EDA52, CK65), Datalogic (Memor 20, Skorpio X5), Panasonic TOUGHBOOK |
| Printers | Honeywell (PM45, PC45), SATO (CL4NX, CL6NX), TSC (MH341T), Bixolon, Brother |
| Scanners | Honeywell (Xenon 1950g, HF680), Datalogic (Gryphon, PowerScan), Code Corp, Socket Mobile |
| RFID | Impinj (R700), Alien Technology, Nordic ID, Honeywell IF6 |
| Software (workforce) | UKG Ready (Kronos), SAP SuccessFactors, ADP Workforce Now |
| Software (inventory) | Manhattan Associates, Blue Yonder Luminate, Oracle Retail |
| Software (device mgmt) | VMware Workspace ONE, Microsoft Intune, SOTI MobiControl |
| Tablets | Honeywell RT10W, Panasonic TOUGHBOOK A3, Getac T800 |
| Kiosks | NCR Atleos, Diebold Nixdorf, Elo Touch |
| AMR | Locus Robotics, 6 River Systems, Geek+ |

---

## Scraping notes for next run

- **Category listing pages are JS-rendered** — product grids don't appear in static HTML. Always go directly to specific product pages.
- **Working product page URL pattern:** `https://www.zebra.com/us/en/products/{category}/{subcategory}/{model}.html`
  - Confirmed: `/mobile-computers/handheld/tc7x-series/tc73.html`, `/mobile-computers/handheld/tc5x-series/tc53.html`, `/printers/card/zc300.html`, `/tablets/et4x-series/et40.html`
  - 404: `/mobile-computers/vehicle-mount/vc8300.html`, `/mobile-computers/vehicle-mount/vc8300-vehicle-mounted-computer.html`
- **VC8300 image URL:** still unknown — try Zebra media library or search `vc8300 zebra site:zebra.com/content/dam`
- **Sort orders** are not enforced unique — session 1 and session 2 products share some sort_order values. Not a functional issue but worth cleaning up if doing a full reset.
- **Success stories page:** `https://www.zebra.com/us/en/resource-library/success-stories.html` — 100+ named customer case studies
