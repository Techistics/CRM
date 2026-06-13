'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUp, ArrowDown, Plus, Trash, Save, Loader2 } from 'lucide-react';

interface PipelineStagesEditorProps {
  onSaved?: () => void
}

export default function PipelineStagesEditor({ onSaved }: PipelineStagesEditorProps) {
  const [stages, setStages] = useState<
    { key: string; label: string; sortOrder: number }[]
  >([]);
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load stages from the GET endpoint (tenant derived from session)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/pipeline-stages');
        if (!res.ok) throw new Error('Failed to load stages');
        const data = await res.json();
        console.log(JSON.stringify(data));
        const extractedStages = data?.data?.stages ?? data?.stages ?? [];
        const extractedIsLocked = data?.data?.isLocked ?? data?.isLocked ?? false;
        setStages(Array.isArray(extractedStages) ? extractedStages : []);
        setIsLocked(extractedIsLocked);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Unable to load pipeline stages');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Helpers -------------------------------------------------------- */
  const addStage = () => {
    setStages((prev) => [
      ...prev,
      { key: `custom_${Date.now()}`, label: '', sortOrder: prev.length },
    ]);
  };

  const renameStage = (idx: number, newLabel: string) => {
    setStages((prev) => {
      const copy = [...prev];
      copy[idx].label = newLabel;
      return copy;
    });
  };

  const moveStage = (idx: number, direction: 'up' | 'down') => {
    setStages((prev) => {
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[newIdx];
      copy[newIdx] = temp;
      return copy.map((s, i) => ({ ...s, sortOrder: i }));
    });
  };

  const deleteStage = (idx: number) => {
    setStages((prev) => prev.filter((_s, i) => i !== idx));
  };

  const validate = (): string | null => {
    const labels = stages.map((s) => s.label.trim());
    if (labels.some((l) => l === '')) return 'Stage labels cannot be empty.';
    const dup = new Set(labels);
    if (dup.size !== labels.length) return 'Stage labels must be unique.';
    if (labels.length < 2) return 'At least two stages are required.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/pipeline-stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No tenantId needed; API derives it from session
        body: JSON.stringify({
          stages: stages.map(({ key, label, sortOrder }) => ({ key, label, sortOrder }))
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error ?? 'Server error')
      }
      toast.success('Pipeline stages saved');
      setIsLocked(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
      onSaved?.();
    }
  };

  return (
    <div className="mt-8 space-y-4 ">
      <h2 className="text-xl font-semibold">Pipeline Stages</h2>

      {isLocked ? (
        <p className="text-sm text-gray-500">
          Stages have been locked. Contact support to change stages.
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading stages...
        </div>
      ) : stages.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">No stages configured yet.</p>
      ) : (
        <ul className="space-y-2">
          {stages?.map((stage, idx) => (
            <li
              key={stage.key}
              className="flex items-center gap-2 bg-gray-50 p-2 rounded"
            >
              <Input
                value={stage.label}
                onChange={(e) => renameStage(idx, e.target.value)}
                disabled={isLocked}
                placeholder="Stage label"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={isLocked || idx === 0}
                onClick={() => moveStage(idx, 'up')}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={isLocked || idx === stages.length - 1}
                onClick={() => moveStage(idx, 'down')}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                disabled={isLocked}
                onClick={() => deleteStage(idx)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!isLocked && (
        <Button variant="outline" size="sm" onClick={addStage}>
          <Plus className="mr-1 h-4 w-4" /> Add Stage
        </Button>
      )}

      {!isLocked && (
        <Button
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white ml-4"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="mr-2 h-4 w-4 text-black" />
          <span className='dark:text-black '> {saving ? 'Saving…' : 'Save Stages'}</span>
        </Button>
      )}
    </div>
  );
}
