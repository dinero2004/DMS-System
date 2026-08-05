import { ClipboardList, Plus, RefreshCw, Save } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Status } from "../components/Status";
import type { ManufacturerProtocol, ManufacturerProtocolPayload } from "../types/domain";

type ProtocolsPageProps = {
  protocols: ManufacturerProtocol[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onCreateProtocol: (protocol: ManufacturerProtocolPayload) => Promise<void>;
};

const emptyProtocol: ManufacturerProtocolPayload = {
  manufacturer: "",
  model: "",
  generation: "",
  inspectionChecklist: "",
  knownIssues: "",
  valuationGuidance: ""
};

export function ProtocolsPage({ protocols, loading, error, onRefresh, onCreateProtocol }: ProtocolsPageProps) {
  const [form, setForm] = useState<ManufacturerProtocolPayload>(emptyProtocol);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onCreateProtocol(form);
      setForm(emptyProtocol);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="toolbar">
        <button className="button secondary" onClick={() => void onRefresh()} type="button">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <Status loading={loading} error={error} empty={!loading && protocols.length === 0} />

      <div className="split-layout protocols-layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Manufacturer protocols</h2>
              <p>{protocols.length} records</p>
            </div>
            <ClipboardList size={20} />
          </div>
          <div className="protocol-list">
            {protocols.map((protocol) => (
              <article className="protocol-item" key={protocol.id}>
                <div>
                  <strong>{protocol.manufacturer} {protocol.model}</strong>
                  <span>{protocol.generation || "General"}</span>
                </div>
                <p>{protocol.valuationGuidance || protocol.inspectionChecklist}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Add protocol</h2>
              <p>Manufacturer/model valuation rules</p>
            </div>
            <Plus size={20} />
          </div>
          <form className="form-grid single-column" onSubmit={(event) => void submit(event)}>
            <TextField label="Manufacturer" value={form.manufacturer} onChange={(manufacturer) => setForm({ ...form, manufacturer })} />
            <TextField label="Model" value={form.model} onChange={(model) => setForm({ ...form, model })} />
            <TextField label="Generation" value={form.generation ?? ""} onChange={(generation) => setForm({ ...form, generation })} />
            <TextArea label="Inspection checklist" value={form.inspectionChecklist} onChange={(inspectionChecklist) => setForm({ ...form, inspectionChecklist })} />
            <TextArea label="Known issues" value={form.knownIssues ?? ""} onChange={(knownIssues) => setForm({ ...form, knownIssues })} />
            <TextArea label="Valuation guidance" value={form.valuationGuidance ?? ""} onChange={(valuationGuidance) => setForm({ ...form, valuationGuidance })} />
            <div className="form-actions">
              <button className="button primary" disabled={saving} type="submit">
                <Save size={16} />
                {saving ? "Saving" : "Save"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input required value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea required={label === "Inspection checklist"} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
