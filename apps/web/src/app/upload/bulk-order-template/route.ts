import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'

const TEMPLATE_HEADERS = [
  'order_ref',
  'customer_name',
  'customer_phone',
  'customer_email',
  'address_line1',
  'address_line2',
  'postcode',
  'city',
  'state',
  'country',
  'payment_method',
  'shipping_method',
  'shipping_fee',
  'discount',
  'private_note',
  'awb_note',
  'item_sku',
  'item_product_name',
  'item_variation_name',
  'item_qty',
] as const

const SAMPLE_ROWS: string[][] = [
  [
    'BULK-0001',
    'Azudin Daem',
    '01133428730',
    'azudin@example.com',
    'No 19, Jalan Impian Putra 4/4D',
    'Taman Impian Putra',
    '43000',
    'Kajang',
    'Selangor',
    'Malaysia',
    'COD',
    'NINJA_VAN',
    '8.00',
    '0.00',
    'Pelanggan minta call sebelum hantar',
    '',
    'COMBO-001',
    'Pakej Combo',
    'Pakej Combo Standard',
    '1',
  ],
  [
    'BULK-0002',
    'Nurul Huda',
    '0126677889',
    'nurul@example.com',
    'No 8, Jalan Anggerik 2',
    'Taman Seri Anggerik',
    '70400',
    'Seremban',
    'Negeri Sembilan',
    'Malaysia',
    'BANK_TRANSFER',
    'SELF_PICKUP',
    '0.00',
    '5.00',
    '',
    'Pickup Sabtu',
    'STK-NAMA-01',
    'Sticker Nama',
    'Sticker Nama 100pcs',
    '2',
  ],
]

const GUIDE_ROWS: string[][] = [
  ['column', 'required', 'description', 'example'],
  ['order_ref', 'yes', 'Unique reference for one order. Use same value across rows to group multiple items into one order.', 'BULK-0001'],
  ['customer_name', 'yes', 'Customer full name.', 'Azudin Daem'],
  ['customer_phone', 'yes', 'Customer phone number.', '01133428730'],
  ['address_line1', 'yes', 'Main delivery address line.', 'No 19, Jalan Impian Putra 4/4D'],
  ['postcode', 'yes', '5-digit Malaysia postcode.', '43000'],
  ['city', 'yes', 'City name.', 'Kajang'],
  ['state', 'yes', 'State name.', 'Selangor'],
  ['country', 'yes', 'Country value.', 'Malaysia'],
  ['payment_method', 'yes', 'Allowed: COD, BANK_TRANSFER, FOC.', 'COD'],
  ['shipping_method', 'yes', 'Allowed: NINJA_VAN, SELF_PICKUP.', 'NINJA_VAN'],
  ['item_sku', 'yes', 'Variant SKU used for product matching.', 'COMBO-001'],
  ['item_qty', 'yes', 'Quantity for this item row.', '1'],
  ['pricing', 'system', 'Unit price always follows the matched product SKU price from the system. Do not prepare manual price values in the template.', 'Auto from SKU'],
  ['shipping_fee', 'no', 'Shipping fee for the order.', '8.00'],
  ['discount', 'no', 'Order-level discount amount.', '0.00'],
  ['private_note', 'no', 'Private internal note.', 'Pelanggan minta call sebelum hantar'],
  ['awb_note', 'no', 'AWB or courier note.', 'Pickup Sabtu'],
]

export async function GET() {
  const workbook = XLSX.utils.book_new()

  const templateSheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS as unknown as string[], ...SAMPLE_ROWS])
  templateSheet['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 24 }))

  const guideSheet = XLSX.utils.aoa_to_sheet(GUIDE_ROWS)
  guideSheet['!cols'] = [
    { wch: 22 },
    { wch: 10 },
    { wch: 80 },
    { wch: 26 },
  ]

  XLSX.utils.book_append_sheet(workbook, templateSheet, 'bulk_order_template')
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'guide')

  const fileBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="bulk-order-template.xlsx"',
      'Cache-Control': 'no-store',
    },
  })
}
