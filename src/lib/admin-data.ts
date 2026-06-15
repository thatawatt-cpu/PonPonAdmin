export type SyncStatus = "synced" | "pending" | "error";

export const adminProducts = [
  { id: "1", zortProductId: "ZP-10001", zortSku: "CK-BOX-12", lastSyncedAt: "13 มิ.ย. 2569 09:42", syncStatus: "synced" as SyncStatus, name: "คุกกี้เนยสดป่องป่อง", category: "ขนม", price: 159, stock: 48, sold: 23000, image: "/images/products/cookies.png", status: "active" },
  { id: "2", zortProductId: "ZP-10002", zortSku: "MT-CLASSIC", lastSyncedAt: "13 มิ.ย. 2569 09:42", syncStatus: "synced" as SyncStatus, name: "ชานมไข่มุกป่องป่อง", category: "เครื่องดื่ม", price: 65, stock: 120, sold: 18000, image: "/images/products/milk-tea.png", status: "active" },
  { id: "3", zortProductId: "ZP-10003", zortSku: "TS-PONPON", lastSyncedAt: "13 มิ.ย. 2569 09:40", syncStatus: "pending" as SyncStatus, name: "เสื้อยืดลาย Pon Pon", category: "แฟชั่น", price: 290, stock: 30, sold: 860, image: "/images/products/tshirt.png", status: "active" },
  { id: "4", zortProductId: "ZP-10004", zortSku: "LIP-01", lastSyncedAt: "13 มิ.ย. 2569 09:39", syncStatus: "synced" as SyncStatus, name: "ลิปทินต์ป่องป่อง", category: "ความงาม", price: 219, stock: 64, sold: 5200, image: "/images/products/lip-tint.png", status: "active" },
  { id: "5", zortProductId: "ZP-10005", zortSku: "TEDDY-01", lastSyncedAt: "13 มิ.ย. 2569 09:38", syncStatus: "error" as SyncStatus, name: "ตุ๊กตาหมีป่องป่อง", category: "ของใช้", price: 459, stock: 18, sold: 430, image: "/images/products/teddy.png", status: "low" },
  { id: "6", zortProductId: "ZP-10006", zortSku: "BREAD-PANDAN", lastSyncedAt: "13 มิ.ย. 2569 09:37", syncStatus: "synced" as SyncStatus, name: "ขนมปังสังขยาใบเตย", category: "ขนม", price: 89, stock: 75, sold: 3900, image: "/images/products/pandan-bread.png", status: "active" },
  { id: "7", zortProductId: "ZP-10007", zortSku: "COFFEE-01", lastSyncedAt: "13 มิ.ย. 2569 09:36", syncStatus: "synced" as SyncStatus, name: "กาแฟสดป่องป่อง", category: "เครื่องดื่ม", price: 75, stock: 90, sold: 1500, image: "/images/products/coffee.png", status: "active" },
  { id: "8", zortProductId: "ZP-10008", zortSku: "BAG-PONPON", lastSyncedAt: "13 มิ.ย. 2569 09:35", syncStatus: "synced" as SyncStatus, name: "กระเป๋าผ้า Pon Pon", category: "แฟชั่น", price: 199, stock: 40, sold: 720, image: "/images/products/tote-bag.png", status: "active" },
  { id: "9", zortProductId: "ZP-10009", zortSku: "TS-OLD", lastSyncedAt: "13 มิ.ย. 2569 09:34", syncStatus: "synced" as SyncStatus, name: "เสื้อยืด Pon Pon รุ่นหมดสต็อก", category: "แฟชั่น", price: 290, stock: 0, sold: 210, image: "/images/products/tshirt.png", status: "soldout" },
];

export const adminOrders = [
  { id: "ORD001", customer: "Pon Pon Customer", phone: "081-234-5678", items: 3, total: 423, payment: "PromptPay", status: "รอตรวจสอบสลิป", createdAt: "8 มิ.ย. 2569 10:24" },
  { id: "ORD002", customer: "Mint", phone: "089-555-0123", items: 1, total: 259, payment: "PromptPay", status: "กำลังแพ็ก", createdAt: "8 มิ.ย. 2569 09:48" },
  { id: "ORD003", customer: "Ploy", phone: "086-111-4422", items: 4, total: 618, payment: "เก็บเงินปลายทาง", status: "จัดส่งแล้ว", createdAt: "7 มิ.ย. 2569 16:20" },
  { id: "ORD004", customer: "Bank", phone: "082-777-3011", items: 2, total: 398, payment: "PromptPay", status: "สำเร็จ", createdAt: "6 มิ.ย. 2569 11:05" },
  { id: "ORD005", customer: "Ning", phone: "095-234-0019", items: 2, total: 548, payment: "PromptPay", status: "ยกเลิก", createdAt: "5 มิ.ย. 2569 13:14" },
];

export const adminCoupons = [
  { code: "PONPON50", name: "คูปองส่วนลด ฿50", value: "฿50", condition: "ซื้อครบ ฿499", used: 128, limit: 500, expires: "15 มิ.ย. 2569", active: true },
  { code: "FREESHIP", name: "ส่งฟรีเมื่อซื้อครบ", value: "FREE", condition: "ซื้อครบ ฿399", used: 204, limit: 800, expires: "18 มิ.ย. 2569", active: true },
  { code: "BUNDLE20", name: "ซื้อคู่แล้วคุ้ม", value: "฿20", condition: "สินค้าเซ็ต", used: 76, limit: 300, expires: "20 มิ.ย. 2569", active: true },
  { code: "LOYAL10", name: "ลูกค้าประจำลด 10%", value: "10%", condition: "สมาชิกเท่านั้น", used: 45, limit: 100, expires: "30 มิ.ย. 2569", active: false },
];

export const adminCustomers = [
  { name: "Pon Pon Customer", lineId: "Uxxxxxxxxxxxxxxxx", orders: 8, spent: 3240, lastOrder: "8 มิ.ย. 2569", tier: "VIP" },
  { name: "Mint", lineId: "Uxxxxxxxmint", orders: 5, spent: 1890, lastOrder: "8 มิ.ย. 2569", tier: "Regular" },
  { name: "Ploy", lineId: "Uxxxxxxxploy", orders: 3, spent: 1240, lastOrder: "7 มิ.ย. 2569", tier: "Regular" },
  { name: "Bank", lineId: "Uxxxxxxxbank", orders: 2, spent: 796, lastOrder: "6 มิ.ย. 2569", tier: "New" },
  { name: "Ning", lineId: "Uxxxxxxxning", orders: 1, spent: 548, lastOrder: "5 มิ.ย. 2569", tier: "New" },
];
