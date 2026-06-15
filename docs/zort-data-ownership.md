# ZORT and PonPon data ownership

PonPon Admin treats ZORT POS as the source of truth for transactional data.
The exact API property names must be mapped from the ZORT payload used by the
project before the integration is enabled.

## Synced from ZORT

- ZORT product identifier
- SKU and barcode
- Base product name
- Selling price
- Inventory quantity
- Variant SKU, price, and inventory
- Sales/order totals
- Order and payment status
- Customer data attached to orders, where available

These fields are read-only in PonPon Admin. Changes must be made in ZORT.

## Stored by PonPon

- Storefront display-name override
- URL slug
- Storefront category and collection mapping
- Multiple product gallery images and video
- Short description and full rich product detail
- Highlights and information cards
- Size guide and storefront option labels
- Badges, featured/bestseller flags, and homepage placement
- Compare-at price and visual promotion labels
- SEO title and description
- Related products, bundles, and review presentation
- Publish/unpublish state for the ecommerce storefront

## Mapping record

Each product needs a local mapping record containing at least:

- `zortProductId`
- `zortSku`
- `localProductId`
- `lastSyncedAt`
- `syncStatus`
- `syncError`
- local storefront content fields

Never overwrite local storefront content during a ZORT synchronization.
