'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUp, ArrowDown, Plus, Trash, Save, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const BRAND = '#0DA2E7'

interface StageRow {
  key: string
  label: string
  sortOrder: number
  meta?: { assignmentTrigger?: boolean } | null
}

interface PipelineStagesEditorProps {
  onSaved?: () => void
}

export default function PipelineStagesEditor({ onSaved }: PipelineStagesEditorProps) {
  const [stages, setStages] = useState<StageRow[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/pipeline-stages');
        if (!res.ok) throw new Error('Failed to load stages');
        const data = await res.json();
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

  const addStage = () => {
    setStages((prev) => [
      ...prev,
      { key: `custom_${Date.now()}`, label: '', sortOrder: prev.length, meta: null },
    ]);
  };

  const renameStage = (idx: number, newLabel: string) => {
    setStages((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], label: newLabel };
      return copy;
    });
  };

  const toggleAssignmentTrigger = (idx: number) => {
    setStages((prev) => {
      const copy = [...prev];
      const current = copy[idx].meta?.assignmentTrigger ?? false;
      copy[idx] = {
        ...copy[idx],
        meta: { ...(copy[idx].meta ?? {}), assignmentTrigger: !current },
      };
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
        body: JSON.stringify({
          stages: stages.map(({ key, label, sortOrder, meta }) => ({ key, label, sortOrder, meta: meta ?? null }))
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
    <div className="mt-8 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Pipeline Stages
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enable <span className="inline-flex items-center gap-1 font-medium text-sky-600 dark:text-sky-400"><Users className="h-3.5 w-3.5" />Co-assign</span> on a stage to show a co-assignment dropdown when a lead reaches that stage.
        </p>
      </div>

      {isLocked ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
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
              className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/50 border border-transparent dark:border-slate-700 p-2 rounded-lg"
            >
              <Input
                value={stage.label}
                onChange={(e) => renameStage(idx, e.target.value)}
                disabled={isLocked}
                placeholder="Stage label"
                className="flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-[#0DA2E7]/30 focus-visible:border-[#0DA2E7]"
              />

              {/* Co-assignment trigger toggle */}
              <button
                type="button"
                disabled={isLocked}
                onClick={() => toggleAssignmentTrigger(idx)}
                title={stage.meta?.assignmentTrigger ? 'Co-assignment required at this stage (click to disable)' : 'Enable co-assignment requirement at this stage'}
                className={cn(
                  'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all border',
                  stage.meta?.assignmentTrigger
                    ? 'bg-sky-50 border-sky-300 text-sky-700 dark:bg-sky-500/10 dark:border-sky-500/40 dark:text-sky-400'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-sky-300 hover:text-sky-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-500',
                  isLocked && 'opacity-50 cursor-not-allowed',
                )}
              >
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Co-assign</span>
              </button>

              <Button
                variant="ghost"
                size="icon"
                disabled={isLocked || idx === 0}
                onClick={() => moveStage(idx, 'up')}
                className="text-slate-500 dark:text-slate-400 hover:text-[#0DA2E7] hover:bg-[#0DA2E7]/10"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={isLocked || idx === stages.length - 1}
                onClick={() => moveStage(idx, 'down')}
                className="text-slate-500 dark:text-slate-400 hover:text-[#0DA2E7] hover:bg-[#0DA2E7]/10"
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
        <Button
          variant="outline"
          size="sm"
          onClick={addStage}
          className="border-[#0DA2E7]/40 text-[#0DA2E7] hover:bg-[#0DA2E7]/10 hover:text-[#0DA2E7]"
        >
          <Plus className="mr-1 h-4 w-4" /> Add Stage
        </Button>
      )}

      {!isLocked && (
        <Button
          className="mt-4 ml-4 text-white"
          style={{ backgroundColor: BRAND }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          <span>{saving ? 'Saving…' : 'Save Stages'}</span>
        </Button>
      )}
    </div>
  );
}
