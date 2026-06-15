"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { adminProducts } from "@/lib/admin-data";

type AdminProduct = (typeof adminProducts)[number];

const categoryDescriptions: Record<string, string> = {
  ขนม: "อบสดใหม่ หอมอร่อย แพ็กพร้อมส่ง เหมาะสำหรับทานเองและเป็นของฝาก",
  เครื่องดื่ม: "ชงสดตามออเดอร์ เลือกระดับความหวานได้ และแพ็กกันกระแทกก่อนส่ง",
  แฟชั่น: "วัสดุคุณภาพดี ใส่สบาย มีตัวเลือกสีและไซซ์ พร้อมตารางขนาดสินค้า",
  ความงาม: "เนื้อสัมผัสบางเบา สีชัด ใช้งานง่าย และเก็บให้พ้นแสงแดดโดยตรง",
  ของใช้: "สินค้าน่ารักสไตล์ PonPon เหมาะสำหรับใช้งานและมอบเป็นของขวัญ",
};

export function ProductEditor({ product }: { product: AdminProduct }) {
  const [active, setActive] = useState(product.status !== "soldout");
  const [saved, setSaved] = useState(false);
  const gallery = [
    product.image,
    product.category === "ขนม"
      ? "/images/products/milk-tea.png"
      : "/images/products/cookies.png",
    product.category === "แฟชั่น"
      ? "/images/products/tote-bag.png"
      : "/images/products/coffee.png",
    "",
  ];

  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">
            Product Editor
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            แก้ไขสินค้า
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            #{product.id} · {product.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/products"
            className="rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-600"
          >
            ยกเลิก
          </Link>
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20"
          >
            {saved ? "บันทึกแล้ว" : "บันทึกการแก้ไข"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
            <div className="flex flex-col gap-3 bg-zinc-950 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
                  ZORT POS · Source of truth
                </p>
                <h2 className="mt-1 text-lg font-black">
                  ข้อมูลที่ซิงก์จาก ZORT
                </h2>
                <p className="mt-1 text-xs text-white/60">
                  ฟิลด์กลุ่มนี้แก้ใน ZORT แล้วรอระบบซิงก์กลับมา
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-black text-emerald-300">
                  เชื่อมต่อแล้ว
                </span>
                <button
                  type="button"
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-zinc-950"
                >
                  Sync now
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <SyncField label="ZORT Product ID" value={product.zortProductId} />
              <SyncField label="SKU / Barcode" value={product.zortSku} />
              <SyncField label="ซิงก์ล่าสุด" value={product.lastSyncedAt} />
              <SyncField label="ชื่อสินค้าใน ZORT" value={product.name} />
              <SyncField label="ราคาขายจาก ZORT" value={`฿${product.price.toLocaleString()}`} />
              <SyncField label="สต็อกคงเหลือรวม" value={`${product.stock} ชิ้น`} />
            </div>
            <div className="border-t border-zinc-100 bg-[#fff8f6] px-5 py-3 text-xs leading-5 text-zinc-500">
              ราคาขาย สต็อก SKU และตัวเลือกที่ผูกคลัง จะถูกเขียนทับทุกครั้งที่ Sync
              จึงไม่ควรแก้จาก PonPon Admin
            </div>
          </section>

          <EditorCard
            title="ข้อมูลที่แสดงบนหน้าร้าน"
            description="ข้อมูลชุดนี้เก็บใน PonPon เพราะใช้จัดหน้าเว็บและไม่ได้พึ่งข้อมูลจาก ZORT"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ชื่อที่แสดงบนเว็บไซต์" className="sm:col-span-2">
                <input defaultValue={product.name} className="admin-input" />
              </Field>
              <Field label="Slug ของหน้าสินค้า">
                <input defaultValue={`ponpon-product-${product.id}`} className="admin-input" />
              </Field>
              <Field label="หมวดหมู่หน้าร้าน">
                <select defaultValue={product.category} className="admin-input">
                  {["ขนม", "เครื่องดื่ม", "แฟชั่น", "ความงาม", "ของใช้"].map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </Field>
              <Field label="คำโปรยสินค้า" className="sm:col-span-2">
                <textarea
                  defaultValue={categoryDescriptions[product.category]}
                  className="admin-input min-h-28 py-3"
                />
              </Field>
            </div>
          </EditorCard>

          <EditorCard
            title="ราคาและการแสดงผล"
            description="ราคาขายและสต็อกมาจาก ZORT ส่วนราคาเต็มและป้ายโปรโมชันจัดการใน PonPon"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="ราคาขายจาก ZORT">
                <input
                  readOnly
                  value={product.price}
                  className="admin-input cursor-not-allowed bg-zinc-100 text-zinc-500"
                />
              </Field>
              <Field label="ราคาเต็มก่อนลด (PonPon)">
                <input type="number" defaultValue={product.price + 40} className="admin-input" />
              </Field>
              <Field label="สต็อกจาก ZORT">
                <input
                  readOnly
                  value={product.stock}
                  className="admin-input cursor-not-allowed bg-zinc-100 text-zinc-500"
                />
              </Field>
              <Field label="SKU จาก ZORT">
                <input
                  readOnly
                  value={product.zortSku}
                  className="admin-input cursor-not-allowed bg-zinc-100 text-zinc-500"
                />
              </Field>
              <Field label="ยอดขายสะสม">
                <input
                  readOnly
                  value={product.sold}
                  className="admin-input cursor-not-allowed bg-zinc-100 text-zinc-500"
                />
              </Field>
              <Field label="Badge โปรโมชัน">
                <select defaultValue="ขายดี" className="admin-input">
                  <option>ไม่มี</option>
                  <option>ขายดี</option>
                  <option>มาใหม่</option>
                  <option>แนะนำ</option>
                  <option>ลดราคา</option>
                </select>
              </Field>
            </div>
          </EditorCard>

          <EditorCard title="รายละเอียดสินค้า" description="รองรับข้อความยาว จุดเด่น และข้อมูลที่แสดงในส่วนรายละเอียด">
            <div className="space-y-4">
              <Field label="หัวข้อรายละเอียด">
                <input defaultValue="รายละเอียดสินค้า" className="admin-input" />
              </Field>
              <Field label="รายละเอียดฉบับเต็ม">
                <textarea
                  defaultValue={`${categoryDescriptions[product.category]}\n\nแพ็กสินค้าอย่างดีทุกออเดอร์ และตรวจสอบคุณภาพก่อนจัดส่ง`}
                  className="admin-input min-h-40 py-3"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                {["คุณภาพดี", "แพ็กดี", "จัดส่งไว"].map((highlight) => (
                  <Field key={highlight} label="จุดเด่น">
                    <input defaultValue={highlight} className="admin-input" />
                  </Field>
                ))}
              </div>
            </div>
          </EditorCard>

          <EditorCard
            title="ตัวเลือกและสต็อกย่อยจาก ZORT"
            description="ใช้ตรวจ mapping ของ SKU ย่อย หากต้องแก้ราคา/สต็อกให้แก้ที่ ZORT POS"
          >
            <div className="overflow-x-auto rounded-2xl border border-zinc-100">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-[#fff8f6] text-xs text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">ตัวเลือก 1</th>
                    <th className="px-4 py-3">ตัวเลือก 2</th>
                    <th className="px-4 py-3">ราคา</th>
                    <th className="px-4 py-3">สต็อก</th>
                    <th className="px-4 py-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {(product.category === "แฟชั่น"
                    ? [["S", "ขาว", 0], ["M", "ขาว", 4], ["M", "แดง", 6], ["L", "ดำ", 2]]
                    : product.category === "เครื่องดื่ม"
                      ? [["หวานน้อย", "เย็น", 36], ["หวานปกติ", "เย็น", 52], ["หวานมาก", "เย็น", 32]]
                      : [["เล็ก", "มาตรฐาน", Math.max(product.stock - 12, 0)], ["ใหญ่", "มาตรฐาน", Math.min(product.stock, 12)]]
                  ).map(([first, second, stock], index) => (
                    <tr key={`${first}-${second}-${index}`}>
                      <td className="px-4 py-3"><span className="font-bold">{first}</span></td>
                      <td className="px-4 py-3"><span className="font-bold">{second}</span></td>
                      <td className="px-4 py-3"><span className="font-black">฿{product.price}</span></td>
                      <td className="px-4 py-3"><span className="font-black">{stock}</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${Number(stock) > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>{Number(stock) > 0 ? "พร้อมขาย" : "หมด"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700">
              หากมี SKU ใหม่ใน ZORT ระบบต้องจับคู่กับตัวเลือกบนหน้าร้านก่อนเผยแพร่
            </p>
          </EditorCard>
        </div>

        <div className="space-y-6">
          <EditorCard
            title="รูปสินค้า (PonPon)"
            description="จัดการรูปหลายรูปสำหรับหน้าร้าน โดยไม่ถูก ZORT Sync เขียนทับ"
          >
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-[#fff8f6]">
              <Image src={product.image} alt={product.name} fill className="object-contain p-5" sizes="480px" />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {gallery.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={`relative aspect-square overflow-hidden rounded-2xl border-2 ${index === 0 ? "border-red-600" : "border-zinc-100 bg-[#fff8f6]"}`}
                >
                  {image ? (
                    <Image src={image} alt={`รูปสินค้า ${index + 1}`} fill className="object-contain p-1.5" sizes="100px" />
                  ) : (
                    <span className="grid h-full place-items-center text-2xl font-light text-red-600">+</span>
                  )}
                </button>
              ))}
            </div>
            <button type="button" className="mt-3 h-11 w-full rounded-full border border-dashed border-red-300 text-xs font-black text-red-600">
              อัปโหลดรูปเพิ่มเติม
            </button>
          </EditorCard>

          <EditorCard
            title="การแสดงผลหน้าร้าน (PonPon)"
            description="ฟิลด์เหล่านี้เป็นข้อมูลเฉพาะ ecommerce และไม่ส่งกลับ ZORT"
          >
            <div className="space-y-3">
              {[
                ["เปิดขายสินค้า", active, () => setActive((value) => !value)],
                ["สินค้าแนะนำ", true, undefined],
                ["สินค้าขายดี", product.sold > 3000, undefined],
                ["แสดงบนหน้าแรก", product.id === "1", undefined],
              ].map(([label, enabled, onClick]) => (
                <div key={String(label)} className="flex items-center justify-between rounded-2xl bg-[#fff8f6] px-4 py-3">
                  <span className="text-sm font-bold">{String(label)}</span>
                  <button
                    type="button"
                    onClick={onClick as (() => void) | undefined}
                    className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-red-600" : "bg-zinc-200"}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-6" : "left-1"}`} />
                  </button>
                </div>
              ))}
            </div>
          </EditorCard>

          <EditorCard title="SEO และการแชร์" description="ข้อมูลสำหรับลิงก์สินค้าและผลการค้นหา">
            <div className="space-y-4">
              <Field label="SEO Title"><input defaultValue={`${product.name} | PonPon Shop`} className="admin-input" /></Field>
              <Field label="Meta Description"><textarea defaultValue={categoryDescriptions[product.category]} className="admin-input min-h-24 py-3" /></Field>
            </div>
          </EditorCard>

          <div className="sticky bottom-4 rounded-3xl border border-red-100 bg-white/95 p-4 shadow-[0_18px_45px_rgba(65,25,25,0.16)] backdrop-blur-xl">
            <p className="text-sm font-black">พร้อมบันทึกการเปลี่ยนแปลง</p>
            <p className="mt-1 text-xs text-zinc-500">การบันทึกจะอัปเดตข้อมูลที่หน้าร้านใช้แสดง</p>
            <button type="button" onClick={save} className="mt-3 h-12 w-full rounded-full bg-red-600 text-sm font-black text-white shadow-lg shadow-red-600/20">
              {saved ? "บันทึกเรียบร้อย" : "บันทึกสินค้า"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-zinc-800">{value}</p>
    </div>
  );
}

function EditorCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
      <h2 className="text-lg font-black">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="text-xs font-black text-zinc-700">{label}</span>
      {children}
    </label>
  );
}
