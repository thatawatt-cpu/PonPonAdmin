"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, RefreshCw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const INTEGRATION_GROUPS = ["LINE", "ZORT", "SHIPPOP", "OMISE", "SUPABASE"] as const;
const SECRET_MASK = "********";

type IntegrationGroup = (typeof INTEGRATION_GROUPS)[number];

type IntegrationField = {
  key: string;
  label: string;
  isSecret: boolean;
  isConfigured: boolean;
  value: string | null;
};

type IntegrationGroupConfig = {
  group: IntegrationGroup;
  fields: IntegrationField[];
};

type SaveState = {
  saving: boolean;
  message: string;
  ok: boolean;
};

export function IntegrationsSettingsForm() {
  const [configs, setConfigs] = useState<IntegrationGroupConfig[]>([]);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveStates, setSaveStates] = useState<Partial<Record<IntegrationGroup, SaveState>>>({});

  async function loadIntegrations() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/backend/admin/settings/integrations");

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "โหลดการตั้งค่า Integrations ไม่สำเร็จ"));
      }

      const data = await response.json();
      const nextConfigs = normalizeIntegrationResponse(data);
      setConfigs(nextConfigs);
      setValues(initialValues(nextConfigs));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "โหลดการตั้งค่า Integrations ไม่สำเร็จ",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadIntegrations();
  }, []);

  const configByGroup = useMemo(
    () => new Map(configs.map((config) => [config.group, config])),
    [configs],
  );

  async function saveGroup(group: IntegrationGroup) {
    const groupValues = values[group] ?? {};

    setSaveStates((current) => ({
      ...current,
      [group]: { saving: true, message: "", ok: false },
    }));

    try {
      const response = await fetch(`/api/backend/admin/settings/integrations/${group}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values: groupValues }),
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, `บันทึก ${group} ไม่สำเร็จ`));
      }

      setSaveStates((current) => ({
        ...current,
        [group]: { saving: false, message: `บันทึก ${group} แล้ว`, ok: true },
      }));
    } catch (saveError) {
      setSaveStates((current) => ({
        ...current,
        [group]: {
          saving: false,
          message: saveError instanceof Error ? saveError.message : `บันทึก ${group} ไม่สำเร็จ`,
          ok: false,
        },
      }));
    }
  }

  function updateValue(group: IntegrationGroup, key: string, value: string) {
    setValues((current) => ({
      ...current,
      [group]: {
        ...(current[group] ?? {}),
        [key]: value,
      },
    }));
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner />
          กำลังโหลด Integrations
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black">Integrations</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            ตั้งค่า service keys สำหรับ LINE, ZORT, SHIPPOP, OMISE และ SUPABASE
          </p>
        </div>
        <Button type="button" variant="outline" onClick={loadIntegrations} disabled={loading}>
          <RefreshCw />
          โหลดใหม่
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4">
        {INTEGRATION_GROUPS.map((group) => {
          const config = configByGroup.get(group) ?? { group, fields: [] };
          const state = saveStates[group];
          const configuredCount = config.fields.filter((field) => field.isConfigured).length;

          return (
            <Card key={group}>
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="size-5 text-muted-foreground" />
                    {group}
                  </CardTitle>
                  <Badge variant={configuredCount > 0 ? "default" : "secondary"}>
                    {configuredCount > 0
                      ? `${configuredCount}/${config.fields.length} configured`
                      : "not configured"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.fields.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Backend ยังไม่ได้ส่ง field สำหรับ {group}
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {config.fields.map((field) => {
                      const inputId = `${group}-${field.key}`;

                      return (
                        <div key={field.key} className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label htmlFor={inputId}>{field.label || field.key}</Label>
                            {field.isConfigured ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="size-3.5" />
                                configured
                              </span>
                            ) : null}
                          </div>
                          <Input
                            id={inputId}
                            type={field.isSecret ? "password" : "text"}
                            value={values[group]?.[field.key] ?? ""}
                            placeholder={field.isSecret && field.isConfigured ? SECRET_MASK : ""}
                            onChange={(event) => updateValue(group, field.key, event.target.value)}
                          />
                          {field.isSecret ? (
                            <p className="text-xs leading-5 text-muted-foreground">
                              {field.isConfigured
                                ? `ถ้าไม่ต้องการเปลี่ยนค่าเดิม ปล่อยเป็น ${SECRET_MASK}`
                                : "ยังไม่มีค่า กรอกเมื่อพร้อมเชื่อมต่อ"}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                {state?.message ? (
                  <p
                    className={
                      state.ok
                        ? "text-sm font-medium text-emerald-700 dark:text-emerald-400"
                        : "text-sm font-medium text-destructive"
                    }
                  >
                    {state.message}
                  </p>
                ) : null}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => saveGroup(group)}
                    disabled={state?.saving || config.fields.length === 0}
                  >
                    {state?.saving ? <Spinner /> : <Save />}
                    {state?.saving ? "กำลังบันทึก..." : `บันทึก ${group}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function initialValues(configs: IntegrationGroupConfig[]) {
  return configs.reduce<Record<string, Record<string, string>>>((groupValues, config) => {
    groupValues[config.group] = config.fields.reduce<Record<string, string>>((fieldValues, field) => {
      fieldValues[field.key] = getDisplayValue(field);
      return fieldValues;
    }, {});
    return groupValues;
  }, {});
}

function getDisplayValue(field: IntegrationField) {
  if (field.isSecret && field.isConfigured) {
    return field.value || SECRET_MASK;
  }

  return field.value ?? "";
}

function normalizeIntegrationResponse(data: unknown): IntegrationGroupConfig[] {
  if (Array.isArray(data)) {
    return data.flatMap(normalizeGroupItem);
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const record = data as Record<string, unknown>;
  const groupItems = Array.isArray(record.groups)
    ? record.groups.flatMap(normalizeGroupItem)
    : [];

  const keyedItems = INTEGRATION_GROUPS.flatMap((group) => {
    const rawFields = record[group] ?? record[group.toLowerCase()];
    return normalizeGroupFields(group, rawFields);
  });

  return mergeConfigs([...groupItems, ...keyedItems]);
}

function normalizeGroupItem(item: unknown): IntegrationGroupConfig[] {
  if (!item || typeof item !== "object") return [];

  const record = item as Record<string, unknown>;
  const rawGroup = String(record.group ?? record.name ?? record.key ?? "").toUpperCase();

  if (!isIntegrationGroup(rawGroup)) return [];

  return normalizeGroupFields(rawGroup, record.fields ?? record.values ?? record.settings);
}

function normalizeGroupFields(group: IntegrationGroup, rawFields: unknown): IntegrationGroupConfig[] {
  const fieldItems = Array.isArray(rawFields)
    ? rawFields
    : rawFields && typeof rawFields === "object"
      ? arrayFromGroupRecord(rawFields as Record<string, unknown>)
      : [];
  const fields = fieldItems.length > 0
    ? fieldItems.map(normalizeField).filter((field): field is IntegrationField => field !== null)
    : [];

  return [{ group, fields }];
}

function arrayFromGroupRecord(record: Record<string, unknown>) {
  const rawFields = record.fields ?? record.values ?? record.settings;
  return Array.isArray(rawFields) ? rawFields : [];
}

function normalizeField(field: unknown): IntegrationField | null {
  if (!field || typeof field !== "object") return null;

  const record = field as Record<string, unknown>;
  const key = String(record.key ?? "").trim();

  if (!key) return null;

  const label = String(record.label ?? key);

  if (shouldHideField(key, label)) return null;

  return {
    key,
    label,
    isSecret: Boolean(record.isSecret),
    isConfigured: Boolean(record.isConfigured),
    value: record.value == null ? null : String(record.value),
  };
}

function shouldHideField(key: string, label: string) {
  const text = `${key} ${label}`.toLowerCase();
  return (
    text.includes("jwt") ||
    text.includes("database connection") ||
    text.includes("databaseconnection") ||
    text.includes("connection string") ||
    text.includes("connectionstring")
  );
}

function mergeConfigs(configs: IntegrationGroupConfig[]) {
  return INTEGRATION_GROUPS.map((group) => {
    const fields = configs
      .filter((config) => config.group === group)
      .flatMap((config) => config.fields);
    const uniqueFields = new Map(fields.map((field) => [field.key, field]));

    return {
      group,
      fields: Array.from(uniqueFields.values()),
    };
  });
}

function isIntegrationGroup(value: string): value is IntegrationGroup {
  return INTEGRATION_GROUPS.includes(value as IntegrationGroup);
}

async function extractErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { message?: string; error?: string };
    return data.message ?? data.error ?? fallback;
  } catch {
    return fallback;
  }
}
