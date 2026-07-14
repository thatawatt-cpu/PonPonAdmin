"use client";

import {
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type AdminRole = "Owner" | "Admin" | "Staff";
type AdminStatus = "Active" | "Disabled";

type Permission =
  | "dashboard.read"
  | "orders.read"
  | "orders.manage"
  | "orders.refund"
  | "products.read"
  | "products.manage"
  | "customers.read"
  | "reviews.manage"
  | "marketing.manage"
  | "integrations.read"
  | "integrations.manage"
  | "settings.manage"
  | "admin_users.read"
  | "admin_users.manage";

type CurrentAdmin = {
  userId: string;
  email: string;
  displayName: string;
  role: AdminRole;
  permissions: string[];
};

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  permissions: string[];
  status: AdminStatus;
  createdAtUtc: string | null;
  lastLoginAtUtc: string | null;
};

type AdminUserListResponse = {
  items?: AdminUser[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalItems?: number;
};

type UserForm = {
  displayName: string;
  email: string;
  password: string;
  permissions: Permission[];
  role: AdminRole;
  status: AdminStatus;
};

const PAGE_SIZE = 20;

const permissionGroups: Array<{
  label: string;
  items: Array<{ value: Permission; label: string }>;
}> = [
  {
    label: "ภาพรวม",
    items: [{ value: "dashboard.read", label: "ดู Dashboard" }],
  },
  {
    label: "ออเดอร์",
    items: [
      { value: "orders.read", label: "ดูออเดอร์" },
      { value: "orders.manage", label: "จัดการออเดอร์" },
      { value: "orders.refund", label: "คืนเงิน" },
    ],
  },
  {
    label: "สินค้าและลูกค้า",
    items: [
      { value: "products.read", label: "ดูสินค้า" },
      { value: "products.manage", label: "จัดการสินค้า" },
      { value: "customers.read", label: "ดูข้อมูลลูกค้า" },
      { value: "reviews.manage", label: "จัดการรีวิว" },
    ],
  },
  {
    label: "การตลาดและระบบ",
    items: [
      { value: "marketing.manage", label: "จัดการการตลาด" },
      { value: "integrations.read", label: "ดู Integration" },
      { value: "integrations.manage", label: "จัดการ Integration" },
      { value: "settings.manage", label: "จัดการ Settings" },
    ],
  },
  {
    label: "ผู้ดูแลระบบ",
    items: [
      { value: "admin_users.read", label: "ดูรายชื่อผู้ดูแล" },
      { value: "admin_users.manage", label: "สร้างและแก้ไขผู้ดูแล" },
    ],
  },
];

const allPermissions = permissionGroups.flatMap((group) =>
  group.items.map((item) => item.value),
);

export function AdminUsersManager() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdmin | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AdminRole | "">("");
  const [status, setStatus] = useState<AdminStatus | "">("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const canRead = hasPermission(currentAdmin, "admin_users.read");
  const canManage = hasPermission(currentAdmin, "admin_users.manage");
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const meResponse = await fetch("/api/backend/admin/auth/me", {
          cache: "no-store",
        });
        if (!meResponse.ok) {
          throw await apiError(meResponse, "โหลดข้อมูลผู้ใช้ปัจจุบันไม่สำเร็จ");
        }
        const me = (await meResponse.json()) as CurrentAdmin;
        if (!active) return;
        setCurrentAdmin(me);

        if (!hasPermission(me, "admin_users.read")) {
          setUsers([]);
          setTotalItems(0);
          return;
        }

        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (search.trim()) params.set("search", search.trim());
        if (role) params.set("role", role);
        if (status) params.set("status", status);

        const usersResponse = await fetch(`/api/backend/admin/users?${params}`, {
          cache: "no-store",
        });
        if (!usersResponse.ok) {
          throw await apiError(usersResponse, "โหลดรายชื่อผู้ดูแลไม่สำเร็จ");
        }
        const body = (await usersResponse.json()) as AdminUserListResponse | AdminUser[];
        if (!active) return;
        const items = Array.isArray(body) ? body : body.items ?? [];
        setUsers(items);
        setTotalItems(
          Array.isArray(body)
            ? items.length
            : body.totalItems ?? body.total ?? items.length,
        );
      } catch (loadError) {
        if (!active) return;
        const message = errorMessage(loadError, "โหลดข้อมูลผู้ดูแลไม่สำเร็จ");
        if (message === "session_expired") {
          router.replace("/login");
          router.refresh();
          return;
        }
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [page, reloadKey, role, router, search, status]);

  function reload(message?: string) {
    if (message) setFeedback(message);
    setReloadKey((value) => value + 1);
  }

  function applyFilter(update: () => void) {
    setPage(1);
    update();
  }

  return (
    <Card>
      <CardHeader className="gap-4 border-b border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="size-5" />
              ผู้ดูแลระบบ
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              สร้างบัญชี กำหนด Role และจำกัดสิทธิ์ตามหน้าที่
            </p>
          </div>
          {canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              เพิ่มผู้ดูแล
            </Button>
          ) : null}
        </div>

        {currentAdmin ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <span className="font-semibold">{currentAdmin.displayName}</span>
            <RoleBadge role={currentAdmin.role} />
            <span className="text-muted-foreground">{currentAdmin.email}</span>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-5">
        {feedback ? (
          <div role="status" className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            {feedback}
            <button type="button" aria-label="ปิดข้อความ" className="grid size-8 place-items-center rounded-md hover:bg-emerald-100" onClick={() => setFeedback("")}>
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        {canRead ? (
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_140px_140px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="ค้นหาชื่อหรืออีเมล"
                className="pl-9"
              />
            </div>
            <NativeSelect className="w-full" value={role} onChange={(event) => applyFilter(() => setRole(event.target.value as AdminRole | ""))} aria-label="กรอง Role">
              <NativeSelectOption value="">ทุก Role</NativeSelectOption>
              <NativeSelectOption value="Owner">Owner</NativeSelectOption>
              <NativeSelectOption value="Admin">Admin</NativeSelectOption>
              <NativeSelectOption value="Staff">Staff</NativeSelectOption>
            </NativeSelect>
            <NativeSelect className="w-full" value={status} onChange={(event) => applyFilter(() => setStatus(event.target.value as AdminStatus | ""))} aria-label="กรองสถานะ">
              <NativeSelectOption value="">ทุกสถานะ</NativeSelectOption>
              <NativeSelectOption value="Active">ใช้งาน</NativeSelectOption>
              <NativeSelectOption value="Disabled">ปิดใช้งาน</NativeSelectOption>
            </NativeSelect>
            <Button variant="outline" size="icon" aria-label="โหลดข้อมูลใหม่" onClick={() => reload()} disabled={loading}>
              <RefreshCw className={cn(loading && "animate-spin")} />
            </Button>
          </div>
        ) : null}

        {loading ? (
          <UsersSkeleton />
        ) : error ? (
          <StatePanel
            icon={<RefreshCw />}
            title="โหลดข้อมูลผู้ดูแลไม่สำเร็จ"
            description={error}
            action={<Button variant="outline" onClick={() => reload()}><RefreshCw />ลองใหม่</Button>}
          />
        ) : !canRead ? (
          <StatePanel
            icon={<ShieldCheck />}
            title="ไม่มีสิทธิ์ดูรายชื่อผู้ดูแล"
            description="บัญชีนี้ไม่มีสิทธิ์ admin_users.read กรุณาติดต่อ Owner"
          />
        ) : users.length === 0 ? (
          <StatePanel
            icon={<Users />}
            title="ไม่พบผู้ดูแล"
            description="ลองเปลี่ยนคำค้นหาหรือตัวกรอง หรือเพิ่มบัญชีผู้ดูแลใหม่"
            action={canManage ? <Button onClick={() => setCreateOpen(true)}><Plus />เพิ่มผู้ดูแล</Button> : undefined}
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-lg border border-border lg:block">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead>ผู้ดูแล</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>สิทธิ์</TableHead>
                    <TableHead>เข้าสู่ระบบล่าสุด</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="w-14" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell><UserIdentity user={user} currentUserId={currentAdmin?.userId} /></TableCell>
                      <TableCell><RoleBadge role={user.role} /></TableCell>
                      <TableCell><PermissionSummary permissions={user.permissions} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(user.lastLoginAtUtc)}</TableCell>
                      <TableCell><StatusBadge status={user.status} /></TableCell>
                      <TableCell><UserActions user={user} currentAdmin={currentAdmin} canManage={canManage} onEdit={() => setEditingUser(user)} onReset={() => setResetUser(user)} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 lg:hidden">
              {users.map((user) => (
                <div key={user.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <UserIdentity user={user} currentUserId={currentAdmin?.userId} />
                    <UserActions user={user} currentAdmin={currentAdmin} canManage={canManage} onEdit={() => setEditingUser(user)} onReset={() => setResetUser(user)} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2"><RoleBadge role={user.role} /><StatusBadge status={user.status} /></div>
                  <div className="mt-3"><PermissionSummary permissions={user.permissions} /></div>
                  <p className="mt-3 text-xs text-muted-foreground">เข้าสู่ระบบล่าสุด {formatDate(user.lastLoginAtUtc)}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">ทั้งหมด {totalItems.toLocaleString("th-TH")} บัญชี</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>ก่อนหน้า</Button>
                <span className="text-sm">หน้า {page.toLocaleString("th-TH")} / {totalPages.toLocaleString("th-TH")}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>ถัดไป</Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {createOpen ? (
        <UserEditorDialog
          mode="create"
          open
          currentAdmin={currentAdmin}
          onOpenChange={setCreateOpen}
          onSaved={() => reload("สร้างบัญชีผู้ดูแลแล้ว")}
        />
      ) : null}
      {editingUser ? (
        <UserEditorDialog
          key={editingUser.id}
          mode="edit"
          open
          user={editingUser}
          currentAdmin={currentAdmin}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            reload("บันทึกข้อมูลผู้ดูแลแล้ว");
          }}
        />
      ) : null}
      {resetUser ? (
        <ResetPasswordDialog
          key={resetUser.id}
          user={resetUser}
          onOpenChange={(open) => !open && setResetUser(null)}
          onSaved={() => {
            setResetUser(null);
            reload("รีเซ็ตรหัสผ่านแล้ว");
          }}
        />
      ) : null}
    </Card>
  );
}

function UserEditorDialog({ mode, open, user, currentAdmin, onOpenChange, onSaved }: { mode: "create" | "edit"; open: boolean; user?: AdminUser | null; currentAdmin: CurrentAdmin | null; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<UserForm>(() => formFromUser(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const ownerLocked = currentAdmin?.role !== "Owner";

  function setRole(nextRole: AdminRole) {
    setForm((current) => ({
      ...current,
      role: nextRole,
      permissions:
        nextRole === "Owner" || nextRole === "Admin"
          ? allPermissions
          : current.permissions,
    }));
  }

  function togglePermission(permission: Permission) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetUser = user ?? null;
    if (mode === "edit" && !targetUser) {
      setError("ไม่พบข้อมูลผู้ดูแลที่ต้องการแก้ไข");
      return;
    }
    if (mode === "create" && form.password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const endpoint = mode === "create"
        ? "/api/backend/admin/users"
        : `/api/backend/admin/users/${targetUser!.id}`;
      const body = mode === "create"
        ? {
            displayName: form.displayName.trim(),
            email: form.email.trim(),
            password: form.password,
            permissions: form.role === "Owner" ? ["*"] : form.permissions,
            role: form.role,
          }
        : {
            displayName: form.displayName.trim(),
            permissions: form.role === "Owner" ? ["*"] : form.permissions,
            role: form.role,
            status: form.status,
          };
      const response = await fetch(endpoint, {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: mode === "create" ? "POST" : "PATCH",
      });
      if (!response.ok) throw await apiError(response, "บันทึกผู้ดูแลไม่สำเร็จ");
      onOpenChange(false);
      onSaved();

      if (
        mode === "edit" &&
        targetUser &&
        targetUser.id === currentAdmin?.userId &&
        (form.role !== targetUser.role ||
          form.status !== targetUser.status ||
          !samePermissions(form.permissions, targetUser.permissions))
      ) {
        router.replace("/login");
        router.refresh();
      }
    } catch (saveError) {
      setError(errorMessage(saveError, "บันทึกผู้ดูแลไม่สำเร็จ"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">{mode === "create" ? "เพิ่มผู้ดูแล" : "แก้ไขผู้ดูแล"}</DialogTitle>
          <DialogDescription>{mode === "create" ? "สร้างบัญชีและกำหนดสิทธิ์ก่อนส่งข้อมูลให้ผู้ใช้งาน" : `แก้ไขข้อมูลของ ${user?.displayName ?? "ผู้ดูแล"}`}</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor={`${mode}-displayName`}>ชื่อที่แสดง</Label><Input id={`${mode}-displayName`} value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} required /></div>
            <div className="space-y-2"><Label htmlFor={`${mode}-email`}>อีเมล</Label><Input id={`${mode}-email`} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} disabled={mode === "edit"} required /></div>
            {mode === "create" ? <div className="space-y-2 sm:col-span-2"><Label htmlFor="create-password">รหัสผ่านเริ่มต้น</Label><Input id="create-password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} minLength={8} autoComplete="new-password" required /><p className="text-xs text-muted-foreground">อย่างน้อย 8 ตัวอักษร</p></div> : null}
            <div className="space-y-2"><Label htmlFor={`${mode}-role`}>Role</Label><NativeSelect id={`${mode}-role`} className="w-full" value={form.role} onChange={(event) => setRole(event.target.value as AdminRole)}><NativeSelectOption value="Admin">Admin</NativeSelectOption><NativeSelectOption value="Staff">Staff</NativeSelectOption>{!ownerLocked || user?.role === "Owner" ? <NativeSelectOption value="Owner">Owner</NativeSelectOption> : null}</NativeSelect></div>
            {mode === "edit" ? <div className="space-y-2"><Label htmlFor="edit-status">สถานะ</Label><NativeSelect id="edit-status" className="w-full" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AdminStatus }))}><NativeSelectOption value="Active">ใช้งาน</NativeSelectOption><NativeSelectOption value="Disabled">ปิดใช้งาน</NativeSelectOption></NativeSelect></div> : null}
          </div>

          <PermissionPicker role={form.role} permissions={form.permissions} onToggle={togglePermission} onSelectAll={() => setForm((current) => ({ ...current, permissions: allPermissions }))} onClear={() => setForm((current) => ({ ...current, permissions: [] }))} />

          {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>ยกเลิก</Button><Button type="submit" disabled={saving}>{saving ? <Spinner /> : <ShieldCheck />}{saving ? "กำลังบันทึก..." : mode === "create" ? "สร้างบัญชี" : "บันทึกการเปลี่ยนแปลง"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PermissionPicker({ role, permissions, onToggle, onSelectAll, onClear }: { role: AdminRole; permissions: Permission[]; onToggle: (permission: Permission) => void; onSelectAll: () => void; onClear: () => void }) {
  const disabled = role === "Owner";
  return <section className="rounded-lg border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">สิทธิ์การใช้งาน</h3><p className="text-xs text-muted-foreground">{disabled ? "Owner มีสิทธิ์ทั้งหมดโดยอัตโนมัติ" : `เลือกแล้ว ${permissions.length} จาก ${allPermissions.length} สิทธิ์`}</p></div>{!disabled ? <div className="flex gap-1"><Button type="button" variant="ghost" size="xs" onClick={onSelectAll}>เลือกทั้งหมด</Button><Button type="button" variant="ghost" size="xs" onClick={onClear}>ล้าง</Button></div> : null}</div><div className="mt-4 grid gap-4 sm:grid-cols-2">{permissionGroups.map((group) => <fieldset key={group.label} className="space-y-2"><legend className="mb-2 text-xs font-bold text-muted-foreground">{group.label}</legend>{group.items.map((item) => <label key={item.value} className={cn("flex min-h-10 items-center gap-2 rounded-md px-2 text-sm", disabled ? "bg-muted/50 text-muted-foreground" : "hover:bg-muted/50")}><input type="checkbox" className="size-4 accent-foreground" checked={disabled || permissions.includes(item.value)} disabled={disabled} onChange={() => onToggle(item.value)} /><span>{item.label}</span><code className="ml-auto hidden text-[10px] text-muted-foreground xl:inline">{item.value}</code></label>)}</fieldset>)}</div></section>;
}

function ResetPasswordDialog({ user, onOpenChange, onSaved }: { user: AdminUser | null; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (password.length < 8) { setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/backend/admin/users/${user.id}/reset-password`, { body: JSON.stringify({ newPassword: password }), headers: { "content-type": "application/json" }, method: "POST" });
      if (!response.ok) throw await apiError(response, "รีเซ็ตรหัสผ่านไม่สำเร็จ");
      onOpenChange(false); onSaved();
      if (user.id) router.refresh();
    } catch (resetError) { setError(errorMessage(resetError, "รีเซ็ตรหัสผ่านไม่สำเร็จ")); }
    finally { setSaving(false); }
  }

  return <Dialog open={Boolean(user)} onOpenChange={(open) => !saving && onOpenChange(open)}><DialogContent><DialogHeader><DialogTitle className="text-lg font-black">รีเซ็ตรหัสผ่าน</DialogTitle><DialogDescription>ตั้งรหัสผ่านใหม่ให้ {user?.displayName} ระบบจะยกเลิก token เดิมของบัญชีนี้</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="reset-password">รหัสผ่านใหม่</Label><Input id="reset-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required /><p className="text-xs text-muted-foreground">อย่างน้อย 8 ตัวอักษร</p></div>{error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>ยกเลิก</Button><Button type="submit" disabled={saving}>{saving ? <Spinner /> : <KeyRound />}{saving ? "กำลังบันทึก..." : "ยืนยันรหัสผ่านใหม่"}</Button></div></form></DialogContent></Dialog>;
}

function UserActions({ user, currentAdmin, canManage, onEdit, onReset }: { user: AdminUser; currentAdmin: CurrentAdmin | null; canManage: boolean; onEdit: () => void; onReset: () => void }) {
  const locked = !canManage || (currentAdmin?.role !== "Owner" && user.role === "Owner");
  if (locked) return null;
  return <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`จัดการ ${user.displayName}`} />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={onEdit}><Pencil />แก้ไขข้อมูลและสิทธิ์</DropdownMenuItem><DropdownMenuItem onClick={onReset}><KeyRound />รีเซ็ตรหัสผ่าน</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}

function UserIdentity({ user, currentUserId }: { user: AdminUser; currentUserId?: string }) { return <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-sky-100 text-sm font-black text-sky-800">{initials(user.displayName)}</span><div className="min-w-0"><p className="truncate font-semibold">{user.displayName} {user.id === currentUserId ? <span className="text-xs font-normal text-muted-foreground">(คุณ)</span> : null}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div></div>; }
function RoleBadge({ role }: { role: AdminRole }) { const classes = role === "Owner" ? "border-violet-200 bg-violet-50 text-violet-700" : role === "Admin" ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-50 text-slate-700"; return <Badge className={cn("border", classes)}>{role}</Badge>; }
function StatusBadge({ status }: { status: AdminStatus }) { return status === "Active" ? <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">ใช้งาน</Badge> : <Badge className="border border-slate-200 bg-slate-100 text-slate-700">ปิดใช้งาน</Badge>; }
function PermissionSummary({ permissions }: { permissions: string[] }) { if (permissions.includes("*")) return <span className="text-sm font-semibold text-violet-700">สิทธิ์ทั้งหมด</span>; return <span className="text-sm text-muted-foreground">{permissions.length.toLocaleString("th-TH")} สิทธิ์</span>; }
function UsersSkeleton() { return <div className="space-y-2">{[0,1,2,3].map((item) => <Skeleton key={item} className="h-16 w-full rounded-lg" />)}</div>; }
function StatePanel({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) { return <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border px-5 text-center"><span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">{icon}</span><h3 className="mt-3 font-black">{title}</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>{action ? <div className="mt-4">{action}</div> : null}</div>; }

function formFromUser(user?: AdminUser | null): UserForm { return { displayName: user?.displayName ?? "", email: user?.email ?? "", password: "", permissions: sanitizePermissions(user?.permissions), role: user?.role ?? "Staff", status: user?.status ?? "Active" }; }
function sanitizePermissions(permissions?: string[]) { return (permissions ?? []).filter((permission): permission is Permission => allPermissions.includes(permission as Permission)); }
function hasPermission(user: CurrentAdmin | null, permission: Permission) { return Boolean(user?.permissions.includes("*") || user?.permissions.includes(permission)); }
function samePermissions(left: string[], right: string[]) { return [...left].sort().join("|") === sanitizePermissions(right).sort().join("|"); }
function initials(value: string) { const trimmed = value.trim(); return trimmed ? trimmed.slice(0, 2).toUpperCase() : "A"; }
function formatDate(value: string | null) { if (!value) return "ยังไม่เคยเข้าสู่ระบบ"; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(date); }

async function apiError(response: Response, fallback: string) { let code = ""; let message = ""; try { const body = await response.json() as { code?: string; error?: string; message?: string }; code = body.code ?? body.error ?? ""; message = body.message ?? ""; } catch { /* Use fallback when the backend does not return JSON. */ } if (response.status === 401) return new Error("session_expired"); if (response.status === 403 || code === "permission_denied") return new Error("บัญชีนี้ไม่มีสิทธิ์ดำเนินการ กรุณาติดต่อ Owner"); if (response.status === 409 || code.includes("email")) return new Error("อีเมลนี้ถูกใช้งานแล้ว"); return new Error(message || fallback); }
function errorMessage(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }
